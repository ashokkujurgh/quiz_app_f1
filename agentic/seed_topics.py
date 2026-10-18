"""
Seeds the subject structure (topics → subtopics) for Indian competitive-exam prep.
Idempotent — 409 (already exists) responses are silently skipped.

Renames run first, in place (same ids, so existing questions and posts stay linked):
an old name is renamed only if it still exists and the new name doesn't.
"""
import logging
import requests
from auth import auth_headers, reset_token
from config import TOPIC_API_URL

logger = logging.getLogger(__name__)

# Descriptions double as metadata: which exams each subject serves.
TOPICS = [
    {
        "name": "Engineering",
        "description": "GATE and PSU engineering subjects — Civil, Mechanical, Electrical, Electronics and Computer Science.",
        "subtopics": [
            "Electrical Engineering",
            "Mechanical Engineering",
            "Civil Engineering",
            "Computer Science",
            "Electronics and Communication",
        ],
    },
    {
        "name": "General Studies",
        "description": "Indian History, Geography, Polity, Economy, General Science and GK for SSC, State SSC, Banking, Police, State and Central Government exams.",
        "subtopics": [
            "Indian History",
            "Indian Geography",
            "Indian Polity",
            "Indian Economy",
            "General Science",
            "General Knowledge",
        ],
    },
    {
        "name": "Aptitude & Reasoning",
        "description": "Quantitative Aptitude, Logical Reasoning and English for SSC, Banking, Police, PSU and private-company recruitment tests.",
        "subtopics": [
            "Quantitative Aptitude",
            "Logical Reasoning",
            "English Language",
        ],
    },
    {
        "name": "Current Affairs",
        "description": "Daily current affairs from official PIB releases, fact-checked and approved, for SSC, Banking, Police, State and Central Government exams.",
        "subtopics": [
            "Current Affairs",
        ],
    },
    {
        "name": "Programming",
        "description": "Programming for Indian students and job seekers — Python, Java, DSA, SQL and web development for campus placements and IT jobs.",
        "subtopics": [
            "Python",
            "Java",
            "Data Structures & Algorithms",
            "SQL & Databases",
            "Web Development",
        ],
    },
]

TOPIC_RENAMES = {"Non Engineering": "General Studies"}
SUBTOPIC_RENAMES = {
    "History": "Indian History",
    "Geography": "Indian Geography",
    "Polity": "Indian Polity",
    "Economy": "Indian Economy",
    "Science and Technology": "General Science",
}


def _apply_renames() -> None:
    topics = requests.get(f"{TOPIC_API_URL}/api/topics", timeout=10).json().get("topics", [])
    names = {t["name"]: t for t in topics}
    for old, new in TOPIC_RENAMES.items():
        if old in names and new not in names:
            r = requests.patch(f"{TOPIC_API_URL}/api/topics/{names[old]['_id']}", json={"name": new},
                               headers=auth_headers(), timeout=10)
            logger.info("Renamed topic %s → %s (%s)", old, new, r.status_code)
    for t in requests.get(f"{TOPIC_API_URL}/api/topics", timeout=10).json().get("topics", []):
        subs = requests.get(f"{TOPIC_API_URL}/api/topics/{t['_id']}/subtopics", timeout=10).json().get("subtopics", [])
        sub_names = {s["name"]: s for s in subs}
        for old, new in SUBTOPIC_RENAMES.items():
            if old in sub_names and new not in sub_names:
                r = requests.patch(f"{TOPIC_API_URL}/api/topics/subtopics/{sub_names[old]['_id']}", json={"name": new},
                                   headers=auth_headers(), timeout=10)
                logger.info("  Renamed subtopic %s → %s (%s)", old, new, r.status_code)


def _update_description(topic_id: str, description: str) -> None:
    requests.patch(f"{TOPIC_API_URL}/api/topics/{topic_id}", json={"description": description},
                   headers=auth_headers(), timeout=10)


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
        _apply_renames()
        for topic_def in TOPICS:
            topic_id = _create_topic(topic_def["name"], topic_def["description"])
            if not topic_id:
                continue
            _update_description(topic_id, topic_def["description"])
            for subtopic_name in topic_def["subtopics"]:
                _create_subtopic(topic_id, subtopic_name)
        logger.info("Seeding complete.")
    except Exception as exc:
        reset_token()
        logger.error("Seeding failed: %s", exc)
