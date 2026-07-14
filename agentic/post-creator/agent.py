"""
Post-creator agent:
1. Fetch all subtopics
2. Pick subtopics with topic-diversity priority
3. Decide post mode (trending 40% / basic 40% / fun 10% / question 10%)
4. Fetch live news (Google News RSS) + Wikipedia background context
5. Generate human-like post content for the chosen mode
6. Embed title+content → check Pinecone for duplicates
7. Save post to MongoDB via post-service (no image)
8. Upsert embedding to Pinecone
"""
import logging
from topic_client import fetch_all_subtopics, pick_subtopics_with_priority
from trending import fetch_trending_news, fetch_web_context, fetch_wikipedia_trending, match_trending_to_subtopic
from generator import generate_post, pick_post_mode, pick_level, embed_text
from pinecone_client import post_exists, upsert_post
from post_client import save_post
from filter_client import is_content_allowed
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

    # 2. Pick with diversity
    selected = pick_subtopics_with_priority(subtopics, POSTS_PER_RUN)
    logger.info("Selected %d subtopics: %s", len(selected), [s["name"] for s in selected])

    # 3. Fetch Wikipedia trending once (for trending_hint)
    trending_titles = fetch_wikipedia_trending(limit=100)

    for subtopic in selected:
        topic_name    = subtopic["topicName"]
        subtopic_name = subtopic["name"]

        # 4. Pick post mode + reading level
        mode  = pick_post_mode()
        level = pick_level()
        logger.info("Processing: %s > %s  [mode=%s, level=%s]", topic_name, subtopic_name, mode, level)

        # 5a. Fetch live trending news (always — used by trending + question modes)
        trending_news = fetch_trending_news(subtopic, limit=6)
        if trending_news:
            logger.info("  Trending news: %d headlines fetched", len(trending_news))
        else:
            logger.info("  No trending news found, will rely on Wikipedia context")

        # 5b. Wikipedia trending hint
        trending_hint = match_trending_to_subtopic(subtopic, trending_titles)
        if trending_hint:
            logger.info("  Wikipedia trending hint: %s", trending_hint)

        # 5c. Wikipedia + RSS background context
        web_context = fetch_web_context(subtopic)

        # 6. Generate content
        generated = generate_post(
            topic_name=topic_name,
            subtopic_name=subtopic_name,
            mode=mode,
            level=level,
            trending_news=trending_news if trending_news else None,
            web_context=web_context or None,
            trending_hint=trending_hint,
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

        # 9. Save to MongoDB (no image)
        post = save_post(
            title=title,
            content=content,
            image_url=None,
            topic_name=topic_name,
            subtopic_name=subtopic_name,
            seo=seo,
        )
        if not post:
            logger.error("MongoDB save failed for '%s'. Skipping Pinecone upsert.", subtopic_name)
            continue

        # 10. Upsert to Pinecone
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
                "trending": trending_hint or "",
            },
        )

        logger.info(
            "✅ [%s/%s] Post created: '%s' (%s > %s)",
            mode.upper(),
            level.upper(),
            (title or "(no title)")[:60],
            topic_name,
            subtopic_name,
        )

    logger.info("=== Post-creator agent finished ===")
