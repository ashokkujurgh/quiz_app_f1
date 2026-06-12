"""
Seeds Engineering and Non Engineering topics with subtopics.
Idempotent — 409 (already exists) responses are silently skipped.
"""
import logging
import requests
from auth import auth_headers, reset_token
from config import TOPIC_API_URL

logger = logging.getLogger(__name__)

TOPICS = [
    {
        "name": "Engineering",
        "description": "Core engineering disciplines and applied sciences.",
        "subtopics": [
            "Electrical Engineering",
            "Mechanical Engineering",
            "Civil Engineering",
            "Computer Science",
            "Electronics and Communication",
        ],
    },
    {
        "name": "Non Engineering",
        "description": "General knowledge, humanities, and social sciences.",
        "subtopics": [
            "History",
            "Geography",
            "Polity",
            "Economy",
            "Science and Technology",
        ],
    },
]


def _create_topic(name: str, description: str) -> str | None:
    resp = requests.post(
        f"{TOPIC_API_URL}/api/topics",
        json={"name": name, "description": description},
        headers=auth_headers(),
        timeout=10,
    )
    if resp.status_code == 201:
        topic_id = resp.json()["topic"]["_id"]
        logger.info("Created topic: %s (%s)", name, topic_id)
        return topic_id
    if resp.status_code == 409:
        all_topics = requests.get(f"{TOPIC_API_URL}/api/topics", timeout=10).json()["topics"]
        for t in all_topics:
            if t["name"].lower() == name.lower():
                logger.debug("Topic already exists: %s", name)
                return t["_id"]
    logger.warning("Unexpected response creating topic '%s': %s", name, resp.status_code)
    return None


def _create_subtopic(topic_id: str, name: str) -> None:
    resp = requests.post(
        f"{TOPIC_API_URL}/api/topics/{topic_id}/subtopics",
        json={"name": name, "description": ""},
        headers=auth_headers(),
        timeout=10,
    )
    if resp.status_code == 201:
        logger.info("  Created subtopic: %s", name)
    elif resp.status_code == 409:
        logger.debug("  Subtopic already exists: %s", name)
    else:
        logger.warning("  Unexpected response for subtopic '%s': %s", name, resp.status_code)


def seed_topics() -> None:
    logger.info("Seeding topics…")
    try:
        for topic_def in TOPICS:
            topic_id = _create_topic(topic_def["name"], topic_def["description"])
            if not topic_id:
                continue
            for subtopic_name in topic_def["subtopics"]:
                _create_subtopic(topic_id, subtopic_name)
        logger.info("Seeding complete.")
    except Exception as exc:
        reset_token()
        logger.error("Seeding failed: %s", exc)
