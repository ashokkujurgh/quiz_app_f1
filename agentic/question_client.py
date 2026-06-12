"""
Save questions to the backend question-service.
"""
import logging
import requests
from auth import auth_headers, reset_token
from config import QUESTION_API_URL

logger = logging.getLogger(__name__)


def save_question(
    question: dict,
    topic_id: str,
    subtopic_id: str | None,
) -> dict | None:
    """
    POST /api/questions
    Returns the saved question dict (with _id) or None on failure.
    """
    payload = {
        "text":          question["text"],
        "description":   question.get("description", ""),
        "options":       question["options"],
        "correctOption": question["correctOption"],
        "topic":         topic_id,
        "subTopic":      subtopic_id,
        "difficulty":    question.get("difficulty", "medium"),
    }

    for attempt in range(2):
        try:
            resp = requests.post(
                f"{QUESTION_API_URL}/api/questions",
                json=payload,
                headers=auth_headers(),
                timeout=10,
            )
            if resp.status_code == 401 and attempt == 0:
                reset_token()
                continue
            resp.raise_for_status()
            saved = resp.json()["question"]
            logger.info("Question saved to backend: %s", saved["_id"])
            return saved
        except Exception as exc:
            logger.error("Failed to save question to backend: %s", exc)
            return None

    return None
