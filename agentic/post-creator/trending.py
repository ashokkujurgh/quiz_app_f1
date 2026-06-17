"""
Fetch web context from Wikipedia + RSS news feeds.
Also includes Google News RSS for real-time trending headlines.
"""
import logging
import requests
import feedparser
from datetime import date, timedelta

logger = logging.getLogger(__name__)

# 50% India, 50% world for these
INDIA_50_SUBTOPICS = {
    "history", "geography", "economics", "economy", "polity", "political science",
    "engineering", "civil engineering", "mechanical engineering", "electrical engineering",
    "computer science", "information technology",
    "general science", "science", "science and technology", "physics", "chemistry", "biology",
}

INDIA_BIASED_SUBTOPICS: set[str] = set()

# 80% current trending news for these
TRENDING_BIASED_SUBTOPICS = {
    "engineering", "civil engineering", "mechanical engineering", "electrical engineering",
    "computer science", "information technology",
    "general science", "science", "science and technology",
    "economics", "economy", "macroeconomics", "microeconomics",
    "geopolitics", "geo politics", "international relations", "current affairs",
    "geography", "environment", "climate",
    "innovation", "technology", "artificial intelligence", "robotics",
}

# RSS feeds — topic-specific + Google News for real-time trending
RSS_FEEDS = {
    "engineering": [
        "https://news.google.com/rss/search?q=engineering+technology&hl=en-IN&gl=IN&ceid=IN:en",
        "https://www.sciencedaily.com/rss/matter_energy/engineering.xml",
        "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
    ],
    "science": [
        "https://news.google.com/rss/search?q=science+discovery+2024&hl=en-IN&gl=IN&ceid=IN:en",
        "https://www.sciencedaily.com/rss/all.xml",
        "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
    ],
    "economics": [
        "https://news.google.com/rss/search?q=economy+finance+india&hl=en-IN&gl=IN&ceid=IN:en",
        "https://feeds.bbci.co.uk/news/business/rss.xml",
        "https://feeds.reuters.com/reuters/businessNews",
    ],
    "geopolitics": [
        "https://news.google.com/rss/search?q=geopolitics+world+news&hl=en-IN&gl=IN&ceid=IN:en",
        "https://feeds.bbci.co.uk/news/world/rss.xml",
        "https://feeds.reuters.com/Reuters/worldNews",
    ],
    "geography": [
        "https://news.google.com/rss/search?q=geography+environment+climate&hl=en-IN&gl=IN&ceid=IN:en",
        "https://www.sciencedaily.com/rss/earth_climate.xml",
    ],
    "innovation": [
        "https://news.google.com/rss/search?q=AI+technology+innovation+2024&hl=en-IN&gl=IN&ceid=IN:en",
        "https://feeds.bbci.co.uk/news/technology/rss.xml",
        "https://www.newscientist.com/feed/home/",
    ],
    "history": [
        "https://news.google.com/rss/search?q=history+heritage+discovery&hl=en-IN&gl=IN&ceid=IN:en",
        "https://feeds.bbci.co.uk/news/rss.xml",
    ],
    "general": [
        "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en",
        "https://feeds.bbci.co.uk/news/rss.xml",
        "https://feeds.reuters.com/reuters/topNews",
    ],
}

WIKI_SEARCH_API  = "https://en.wikipedia.org/w/api.php"
WIKI_SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/"


# ── helpers ───────────────────────────────────────────────────────────────────

def _is_india_biased(subtopic_name: str) -> bool:
    return any(kw in subtopic_name.lower() for kw in INDIA_BIASED_SUBTOPICS)

def _is_india_50(subtopic_name: str) -> bool:
    return any(kw in subtopic_name.lower() for kw in INDIA_50_SUBTOPICS)

def _is_trending_biased(subtopic_name: str) -> bool:
    return any(kw in subtopic_name.lower() for kw in TRENDING_BIASED_SUBTOPICS)


def _wiki_summary(title: str) -> str | None:
    try:
        resp = requests.get(
            WIKI_SUMMARY_URL + title.replace(" ", "_"),
            headers={"User-Agent": "Meenzo/1.0"},
            timeout=8,
        )
        if resp.ok:
            return resp.json().get("extract", "")
    except Exception:
        pass
    return None


def _wiki_search(query: str, limit: int = 3) -> list[str]:
    try:
        resp = requests.get(
            WIKI_SEARCH_API,
            params={"action": "query", "list": "search", "srsearch": query,
                    "srlimit": limit, "format": "json"},
            headers={"User-Agent": "Meenzo/1.0"},
            timeout=8,
        )
        if resp.ok:
            return [r["title"] for r in resp.json().get("query", {}).get("search", [])]
    except Exception:
        pass
    return []


def _rss_feed_key(subtopic_name: str) -> str:
    name = subtopic_name.lower()
    if any(k in name for k in ["engineer", "computer", "software", "it ", "information tech"]):
        return "engineering"
    if any(k in name for k in ["science", "physics", "chemistry", "biology", "space"]):
        return "science"
    if any(k in name for k in ["econom", "finance", "market", "trade", "gdp", "inflation"]):
        return "economics"
    if any(k in name for k in ["geopolit", "international", "affairs", "diplomacy", "war", "politic"]):
        return "geopolitics"
    if any(k in name for k in ["geography", "environment", "climate", "ocean", "forest"]):
        return "geography"
    if any(k in name for k in ["innovat", "ai", "robot", "tech", "startup", "digital"]):
        return "innovation"
    if any(k in name for k in ["history", "ancient", "heritage", "civiliz", "medieval"]):
        return "history"
    return "general"


def _fetch_rss_headlines(subtopic_name: str, limit: int = 8) -> list[dict]:
    """Fetch recent headlines from RSS feeds (includes Google News)."""
    key   = _rss_feed_key(subtopic_name)
    feeds = RSS_FEEDS.get(key, RSS_FEEDS["general"])
    headlines: list[dict] = []

    for feed_url in feeds:
        try:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries[:limit]:
                title   = entry.get("title", "")
                summary = entry.get("summary", entry.get("description", ""))[:400]
                published = entry.get("published", "")
                if title:
                    headlines.append({"title": title, "summary": summary, "published": published})
            if len(headlines) >= limit:
                break
        except Exception as exc:
            logger.warning("RSS feed failed (%s): %s", feed_url, exc)

    logger.info("Fetched %d headlines for '%s'", len(headlines), subtopic_name)
    return headlines[:limit]


def _filter_headlines_by_subtopic(headlines: list[dict], subtopic_name: str) -> list[dict]:
    keywords = [w for w in subtopic_name.lower().split() if len(w) > 3]
    if not keywords:
        return headlines
    filtered = [h for h in headlines if any(k in h["title"].lower() or k in h["summary"].lower() for k in keywords)]
    return filtered if filtered else headlines


def fetch_trending_news(subtopic: dict, limit: int = 6) -> list[dict]:
    """
    Fetch fresh trending news headlines for the given subtopic.
    Returns list of {title, summary, published} dicts.
    """
    subtopic_name = subtopic["name"]
    topic_name    = subtopic.get("topicName", "")

    # Try Google News first with a targeted query
    query = f"{subtopic_name} {topic_name}".strip()
    google_url = f"https://news.google.com/rss/search?q={requests.utils.quote(query)}&hl=en-IN&gl=IN&ceid=IN:en"
    headlines: list[dict] = []
    try:
        feed = feedparser.parse(google_url)
        for entry in feed.entries[:limit]:
            title   = entry.get("title", "")
            summary = entry.get("summary", "")[:400]
            published = entry.get("published", "")
            if title:
                headlines.append({"title": title, "summary": summary, "published": published})
    except Exception as exc:
        logger.warning("Google News fetch failed: %s", exc)

    # Supplement with RSS if needed
    if len(headlines) < 3:
        rss = _fetch_rss_headlines(subtopic_name, limit=limit)
        rss = _filter_headlines_by_subtopic(rss, subtopic_name)
        seen = {h["title"] for h in headlines}
        for h in rss:
            if h["title"] not in seen:
                headlines.append(h)

    return headlines[:limit]


# ── public interface ──────────────────────────────────────────────────────────

def fetch_web_context(subtopic: dict) -> str:
    subtopic_name   = subtopic["name"]
    topic_name      = subtopic.get("topicName", "")
    india_80        = _is_india_biased(subtopic_name)
    india_50        = _is_india_50(subtopic_name)
    trending_biased = _is_trending_biased(subtopic_name)

    sections: list[str] = []

    if trending_biased:
        headlines = fetch_trending_news(subtopic, limit=6)
        if headlines:
            news_block = "\n".join(
                f"• {h['title']}" + (f": {h['summary'][:200]}" if h['summary'] else "")
                for h in headlines[:5]
            )
            sections.append(f"[CURRENT NEWS — primary angle, 80% focus]\n{news_block}")

    if india_50:
        indian_summary = None
        indian_title   = None
        for query in [f"Indian {subtopic_name}", f"{subtopic_name} India", f"India {subtopic_name}"]:
            for title in _wiki_search(query, limit=4):
                skip_words = {"civil service", "civil war", "civil code", "services of india"}
                if any(s in title.lower() for s in skip_words):
                    continue
                summary = _wiki_summary(title)
                if summary and len(summary) > 100:
                    indian_summary = summary
                    indian_title   = title
                    break
            if indian_summary:
                break
        if indian_summary:
            sections.append(f"[INDIA CONTEXT — 50% focus]\n[{indian_title}]\n{indian_summary[:500]}")

        for title in _wiki_search(f"{subtopic_name}", limit=3):
            if "india" not in title.lower():
                summary = _wiki_summary(title)
                if summary and len(summary) > 100:
                    sections.append(f"[GLOBAL CONTEXT — 50% focus]\n[{title}]\n{summary[:500]}")
                    break

    elif india_80:
        indian_titles = _wiki_search(f"India {subtopic_name}", limit=2)
        for title in indian_titles[:1]:
            summary = _wiki_summary(title)
            if summary:
                sections.append(f"[INDIA CONTEXT — 80% focus]\n[{title}]\n{summary[:600]}")
                break
        world_titles = _wiki_search(f"{subtopic_name} world overview", limit=1)
        for title in world_titles[:1]:
            summary = _wiki_summary(title)
            if summary:
                sections.append(f"[GLOBAL CONTEXT — 20% focus]\n[{title}]\n{summary[:300]}")

    elif not trending_biased:
        for query in [f"{subtopic_name} {topic_name}", subtopic_name]:
            titles = _wiki_search(query, limit=2)
            for title in titles[:1]:
                summary = _wiki_summary(title)
                if summary:
                    sections.append(f"[REFERENCE]\n[{title}]\n{summary[:600]}")
                    break

    context = "\n\n".join(sections)
    if context:
        logger.info("Web context ready for '%s' (%d chars)", subtopic_name, len(context))
    else:
        logger.warning("No web context found for '%s'", subtopic_name)
    return context


def fetch_wikipedia_trending(limit: int = 50) -> list[str]:
    try:
        yesterday = date.today() - timedelta(days=2)
        url = (
            f"https://wikimedia.org/api/rest_v1/metrics/pageviews/top/"
            f"en.wikipedia/all-access/{yesterday.year}/{yesterday.month:02d}/{yesterday.day:02d}"
        )
        resp = requests.get(url, timeout=8)
        resp.raise_for_status()
        articles = resp.json()["items"][0]["articles"]
        return [a["article"].replace("_", " ") for a in articles[:limit]]
    except Exception as exc:
        logger.warning("Wikipedia trending fetch failed: %s", exc)
        return []


def match_trending_to_subtopic(subtopic: dict, trending_titles: list[str]) -> str | None:
    subtopic_kw = subtopic["name"].lower()
    topic_kw    = subtopic.get("topicName", "").lower()
    keywords    = set(subtopic_kw.split() + topic_kw.split())
    stop = {"of", "and", "the", "in", "for", "a", "an", "to", "with", "on", "at"}
    keywords -= stop
    for title in trending_titles:
        title_lower = title.lower()
        if any(kw in title_lower for kw in keywords if len(kw) > 3):
            return title
    return None
