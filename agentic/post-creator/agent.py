"""
Post-creator agent:
1. Fetch all subtopics
2. Pick subtopics with topic-diversity priority
3. Decide post mode (basic 70% / fun 15% / question 15%), reading level and region
4. Fetch Wikipedia background context (reference articles only — no news)
5. Generate a textbook-style post for the chosen mode
6. Embed title+content → check Pinecone for duplicates
7. Generate a cover image (Gemini) and upload it to Spaces — optional, skipped on failure
8. Save post to MongoDB via post-service
9. Email the reviewer for approval
10. Upsert embedding to Pinecone
"""
import logging
from topic_client import fetch_all_subtopics, pick_subtopics_with_priority
from trending import fetch_web_context
from generator import generate_post, pick_post_mode, pick_level, pick_region, embed_text, generate_image
from auth_client import upload_image
from pinecone_client import post_exists, upsert_post
from post_client import save_post
from filter_client import is_content_allowed
from notifier import send_approval_email
from config import POSTS_PER_RUN, IMAGE_ENABLED

MAX_RETRIES = 2  # other subjects to try when a post is rejected

logger = logging.getLogger(__name__)


def run_agent() -> None:
    logger.info("=== Post-creator agent started ===")

    # 1. Fetch subtopics
    try:
        subtopics = fetch_all_subtopics()
    except Exception as exc:
        logger.error("Could not fetch subtopics: %s", exc)
        return

    # Current affairs have their own fact-checked, approval-gated pipeline — no posts from memory
    subtopics = [s for s in subtopics if s.get("topicName", "").strip().lower() != "current affairs"]

    if not subtopics:
        logger.warning("No active subtopics found. Skipping.")
        return

    # 2. Pick with diversity
    # Extra candidates: if a post is rejected (e.g. by the fact-check), try another subject
    # so the run still delivers POSTS_PER_RUN posts.
    selected = pick_subtopics_with_priority(subtopics, POSTS_PER_RUN + MAX_RETRIES)
    logger.info("Candidates (%d needed): %s", POSTS_PER_RUN, [s["name"] for s in selected])
    created = 0

    for subtopic in selected:
        if created >= POSTS_PER_RUN:
            break
        topic_name    = subtopic["topicName"]
        subtopic_name = subtopic["name"]

        # 4. Pick post mode + reading level + region (60% India / 40% world)
        mode   = pick_post_mode()
        level  = pick_level()
        region = pick_region()
        logger.info("Processing: %s > %s  [mode=%s, level=%s, region=%s]", topic_name, subtopic_name, mode, level, region)

        # 5. Background context from Wikipedia reference articles only — no news or trending
        #    topics, so the post sticks to verifiable textbook knowledge
        web_context = fetch_web_context(subtopic, region=region, include_news=False)

        # 6. Generate content
        generated = generate_post(
            topic_name=topic_name,
            subtopic_name=subtopic_name,
            mode=mode,
            level=level,
            web_context=web_context or None,
            region=region,
        )
        if not generated:
            logger.warning("Content generation failed for '%s'. Skipping.", subtopic_name)
            continue

        title   = generated.get("title") or None
        content = generated["content"]
        seo     = generated.get("seo")

        # 7. Embed and check duplicate
        embedding_text = f"{title}\n{content}" if title else content
        try:
            embedding = embed_text(embedding_text)
        except Exception as exc:
            logger.error("Embedding failed: %s", exc)
            continue

        exists, matched_id = post_exists(embedding)
        if exists:
            logger.info("Duplicate detected (matched=%s) for '%s'. Skipping.", matched_id, subtopic_name)
            continue

        # 8. Content policy filter
        filter_text = f"{title}\n{content}" if title else content
        allowed, filter_reason = is_content_allowed(filter_text)
        if not allowed:
            logger.warning(
                "Post BLOCKED by filter for '%s': %s. Skipping.",
                subtopic_name, filter_reason,
            )
            continue

        # 9. Generate + upload a cover image (post is still saved if this fails)
        image_url = None
        if IMAGE_ENABLED:
            image = generate_image(title, content, topic_name, subtopic_name)
            if image:
                image_url = upload_image(*image)
                if image_url:
                    logger.info("  Image uploaded: %s", image_url)
            if not image_url:
                logger.warning("  No image for '%s' — saving post without one.", subtopic_name)

        # 10. Save to MongoDB
        post = save_post(
            title=title,
            content=content,
            image_url=image_url,
            topic_name=topic_name,
            subtopic_name=subtopic_name,
            seo=seo,
        )
        if not post:
            logger.error("MongoDB save failed for '%s'. Skipping Pinecone upsert.", subtopic_name)
            continue

        # 11. Email the reviewer a reminder that a post is waiting for approval (failures are logged, not fatal)
        send_approval_email(
            post=post, title=title, content=content, image_url=image_url,
            topic_name=topic_name, subtopic_name=subtopic_name,
            mode=mode, level=level, region=region,
        )

        # 12. Upsert to Pinecone
        upsert_post(
            post_id=post["_id"],
            embedding=embedding,
            metadata={
                "post_id":  post["_id"],
                "title":    title,
                "topic":    topic_name,
                "subtopic": subtopic_name,
                "mode":     mode,
                "level":    level,
                "region":   region,
            },
        )

        created += 1
        logger.info(
            "✅ [%s/%s] Post created: '%s' (%s > %s)",
            mode.upper(),
            level.upper(),
            (title or "(no title)")[:60],
            topic_name,
            subtopic_name,
        )

    if created < POSTS_PER_RUN:
        logger.warning("Only %d of %d post(s) created this run.", created, POSTS_PER_RUN)
    logger.info("=== Post-creator agent finished (%d post(s) created) ===", created)
