"""
Seeds Indian non-engineering topics and subtopics into the topic-service.
Safe to run multiple times — 409 (already exists) responses are silently ignored.
"""
import logging
import requests
from auth import auth_headers, reset_token
from config import TOPIC_API_URL

logger = logging.getLogger(__name__)

INDIAN_TOPICS = [
    {
        "name": "Indian History",
        "description": "Ancient, medieval, and modern Indian history including the freedom struggle.",
        "subtopics": [
            "Ancient India",
            "Medieval India",
            "Mughal Empire",
            "Indian Freedom Struggle",
            "Post-Independence India",
        ],
    },
    {
        "name": "Indian Geography",
        "description": "Physical and political geography of India.",
        "subtopics": [
            "Rivers and Lakes",
            "Mountains and Passes",
            "States and Capitals",
            "Climate and Seasons",
            "National Parks and Wildlife",
        ],
    },
    {
        "name": "Indian Polity",
        "description": "Indian Constitution, governance, and political system.",
        "subtopics": [
            "Indian Constitution",
            "Fundamental Rights and Duties",
            "Parliament of India",
            "Judiciary System",
            "Panchayati Raj",
        ],
    },
    {
        "name": "Indian Economy",
        "description": "Indian economic system, policies, and key sectors.",
        "subtopics": [
            "Agriculture in India",
            "Five Year Plans",
            "Banking and Finance",
            "Indian Budget",
            "Schemes and Programmes",
        ],
    },
    {
        "name": "Indian Culture",
        "description": "Art, literature, festivals, and traditions of India.",
        "subtopics": [
            "Classical Dance Forms",
            "Indian Festivals",
            "Classical Music",
            "Indian Literature",
            "Folk Arts and Crafts",
        ],
    },
    {
        "name": "Indian Science and Technology",
        "description": "India's achievements in science, space, and technology.",
        "subtopics": [
            "ISRO and Space Missions",
            "Indian Scientists",
            "Defence Technology",
            "Nuclear Programme",
            "Digital India Initiatives",
        ],
    },
]


def _create_topic(name: str, description: str) -> str | None:
    """Create a topic; return its _id (or existing id on 409)."""
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
        # Already exists — fetch its id
        topics = requests.get(f"{TOPIC_API_URL}/api/topics", timeout=10).json()["topics"]
        for t in topics:
            if t["name"].lower() == name.lower():
                logger.debug("Topic already exists: %s", name)
                return t["_id"]
    logger.warning("Unexpected response creating topic '%s': %s %s", name, resp.status_code, resp.text)
    return None


def _create_subtopic(topic_id: str, name: str, description: str) -> None:
    resp = requests.post(
        f"{TOPIC_API_URL}/api/topics/{topic_id}/subtopics",
        json={"name": name, "description": f"Questions about {name} in the Indian context."},
        headers=auth_headers(),
        timeout=10,
    )
    if resp.status_code == 201:
        logger.info("  Created subtopic: %s", name)
    elif resp.status_code == 409:
        logger.debug("  Subtopic already exists: %s", name)
    else:
        logger.warning("  Unexpected response for subtopic '%s': %s", name, resp.status_code)


def seed_indian_topics() -> None:
    logger.info("Seeding Indian non-engineering topics…")
    try:
        for topic_def in INDIAN_TOPICS:
            topic_id = _create_topic(topic_def["name"], topic_def["description"])
            if not topic_id:
                continue
            for subtopic_name in topic_def["subtopics"]:
                _create_subtopic(topic_id, subtopic_name, "")
        logger.info("Seeding complete.")
    except Exception as exc:
        reset_token()
        logger.error("Seeding failed: %s", exc)
