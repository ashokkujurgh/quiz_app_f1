"""
Post-creator agent:
1. Fetch all subtopics
2. Pick subtopics with topic-diversity priority
3. Fetch web context from Wikipedia (India-biased for relevant subtopics)
4. Generate title + content using real research context
5. Embed title+content → check Pinecone for duplicates
6. Generate image
7. Save post to MongoDB via post-service
8. Upsert embedding to Pinecone
"""
import logging
from topic_client import fetch_all_subtopics, pick_subtopics_with_priority
from trending import fetch_web_context, fetch_wikipedia_trending, match_trending_to_subtopic
from generator import generate_title_and_content, generate_image, embed_text
from pinecone_client import post_exists, upsert_post
from post_client import save_post
from config import POSTS_PER_RUN

logger = logging.getLogger(__name__)


def run_agent() -> None:
    logger.info("=== Post-creator agent started ===")

    # 1. Fetch subtopics
    try:
        subtopics = fetch_all_subtopics()
    except Exception as exc:
        logger.error("Could not fetch subtopics: %s", exc)
        return

    if not subtopics:
        logger.warning("No active subtopics found. Skipping.")
        return

    # 2. Pick with priority (diverse topics)
    selected = pick_subtopics_with_priority(subtopics, POSTS_PER_RUN)
    logger.info("Selected %d subtopics: %s", len(selected), [s["name"] for s in selected])

    # 3. Fetch trending titles once
    trending_titles = fetch_wikipedia_trending(limit=100)

    for subtopic in selected:
        topic_name    = subtopic["topicName"]
        subtopic_name = subtopic["name"]

        logger.info("Processing: %s > %s", topic_name, subtopic_name)

        # 4. Fetch real web context from Wikipedia
        web_context   = fetch_web_context(subtopic)
        trending_hint = match_trending_to_subtopic(subtopic, trending_titles)
        if trending_hint:
            logger.info("Trending hint: %s", trending_hint)

        # 5. Generate title + content with research context
        generated = generate_title_and_content(
            topic_name, subtopic_name, trending_hint, web_context or None
        )
        if not generated:
            logger.warning("Content generation failed for '%s'. Skipping.", subtopic_name)
            continue

        title   = generated.get("title") or None
        content = generated["content"]
        seo     = generated.get("seo")

        # 6. Embed and check for duplicate in Pinecone
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

        # 7. Generate image
        image_url = generate_image(title, subtopic_name, topic_name)

        # 8. Save to MongoDB
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

        # 9. Upsert to Pinecone
        upsert_post(
            post_id=post["_id"],
            embedding=embedding,
            metadata={
                "post_id":  post["_id"],
                "title":    title,
                "topic":    topic_name,
                "subtopic": subtopic_name,
                "trending": trending_hint or "",
            },
        )

        logger.info(
            "✅ Post created: '%s' (%s > %s)%s",
            (title or "(no title)")[:60], topic_name, subtopic_name,
            f" [trending: {trending_hint[:40]}]" if trending_hint else "",
        )

    logger.info("=== Post-creator agent finished ===")
