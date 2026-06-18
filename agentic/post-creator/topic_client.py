"""
Fetch subtopics from the topic-service with trending priority.
"""
import logging
import random
import requests
from config import TOPIC_API_URL

logger = logging.getLogger(__name__)


def fetch_topics() -> list[dict]:
    resp = requests.get(f"{TOPIC_API_URL}/api/topics", timeout=10)
    resp.raise_for_status()
    data = resp.json()
    return [t for t in (data.get("topics") or data.get("data") or []) if t.get("isActive")]


def fetch_subtopics(topic_id: str) -> list[dict]:
    resp = requests.get(f"{TOPIC_API_URL}/api/topics/{topic_id}/subtopics", timeout=10)
    resp.raise_for_status()
    data = resp.json()
    return [s for s in (data.get("subtopics") or data.get("data") or []) if s.get("isActive")]


def fetch_all_subtopics() -> list[dict]:
    """Return all active subtopics enriched with topicName/topicId."""
    all_subtopics: list[dict] = []
    topics = fetch_topics()
    for topic in topics:
        subs = fetch_subtopics(topic["_id"])
        for s in subs:
            s["topicName"] = topic["name"]
            s["topicId"]   = topic["_id"]
        all_subtopics.extend(subs)
    logger.info("Fetched %d subtopics from %d topics.", len(all_subtopics), len(topics))
    return all_subtopics


def pick_subtopics_with_priority(subtopics: list[dict], n: int) -> list[dict]:
    """
    Weight subtopics by recency/diversity — shuffle then take n unique topics
    so we don't repeat the same subject twice in one run.
    """
    if not subtopics:
        return []
    # Shuffle for variety
    pool = subtopics.copy()
    random.shuffle(pool)
    # Deduplicate by topicName to ensure variety across topics
    seen_topics: set[str] = set()
    selected: list[dict] = []
    for s in pool:
        if s["topicName"] not in seen_topics or len(selected) < n:
            selected.append(s)
            seen_topics.add(s["topicName"])
        if len(selected) >= n:
            break
    return selected
