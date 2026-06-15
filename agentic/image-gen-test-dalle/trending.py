"""
Fetch trending topics from Wikipedia's "trending" API and match against our subtopics.
Falls back gracefully if the API is unreachable.
"""
import logging
import requests

logger = logging.getLogger(__name__)

WIKI_TRENDING_URL = (
    "https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/2024/11/01"
)
NEWSAPI_URL = "https://newsdata.io/api/1/news"


def fetch_wikipedia_trending(limit: int = 50) -> list[str]:
    """Return top Wikipedia article titles for a recent date."""
    try:
        from datetime import date, timedelta
        yesterday = date.today() - timedelta(days=2)
        url = (
            f"https://wikimedia.org/api/rest_v1/metrics/pageviews/top/"
            f"en.wikipedia/all-access/{yesterday.year}/{yesterday.month:02d}/{yesterday.day:02d}"
        )
        resp = requests.get(url, timeout=8)
        resp.raise_for_status()
        articles = resp.json()["items"][0]["articles"]
        titles = [a["article"].replace("_", " ") for a in articles[:limit]]
        logger.info("Fetched %d trending Wikipedia articles.", len(titles))
        return titles
    except Exception as exc:
        logger.warning("Wikipedia trending fetch failed: %s", exc)
        return []


def match_trending_to_subtopic(subtopic: dict, trending_titles: list[str]) -> str | None:
    """
    Return the first trending title that semantically overlaps with the subtopic name or topic name.
    Simple keyword matching — fast and free.
    """
    subtopic_kw  = subtopic["name"].lower()
    topic_kw     = subtopic.get("topicName", "").lower()
    keywords     = set(subtopic_kw.split() + topic_kw.split())
    # Remove very common words
    stop = {"of", "and", "the", "in", "for", "a", "an", "to", "with", "on", "at"}
    keywords -= stop

    for title in trending_titles:
        title_lower = title.lower()
        if any(kw in title_lower for kw in keywords if len(kw) > 3):
            logger.info("Trending match: '%s' → subtopic '%s'", title, subtopic["name"])
            return title
    return None
