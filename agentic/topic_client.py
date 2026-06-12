"""
Fetch topics and subtopics from the topic-service.
"""
import logging
import requests
from config import TOPIC_API_URL

logger = logging.getLogger(__name__)


def fetch_topics() -> list[dict]:
    resp = requests.get(f"{TOPIC_API_URL}/api/topics", timeout=10)
    resp.raise_for_status()
    return [t for t in resp.json()["topics"] if t.get("isActive")]


def fetch_subtopics(topic_id: str) -> list[dict]:
    resp = requests.get(f"{TOPIC_API_URL}/api/topics/{topic_id}/subtopics", timeout=10)
    resp.raise_for_status()
    return [s for s in resp.json()["subtopics"] if s.get("isActive")]


def fetch_all_subtopics() -> list[dict]:
    """Return all active subtopics across all active topics."""
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
