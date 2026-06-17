"""
REST helpers for the quiz service.
"""
import logging
import requests
from auth import get_token
from config import QUIZ_SERVICE_URL, PLAYER_USERS

logger = logging.getLogger(__name__)


def _headers() -> dict:
    """Use the first player's token for read-only calls."""
    token = get_token(PLAYER_USERS[0]["email"])
    return {"Authorization": f"Bearer {token}"} if token else {}


def get_active_quizzes() -> list[dict]:
    """Return all currently active quizzes."""
    try:
        resp = requests.get(
            f"{QUIZ_SERVICE_URL}/api/quizzes/active",
            headers=_headers(),
            timeout=10,
        )
        if resp.ok:
            return resp.json().get("quizzes", [])
    except Exception as exc:
        logger.warning("get_active_quizzes error: %s", exc)
    return []


def get_admin_quizzes(admin_user_id: str | None) -> list[dict]:
    """
    Return active quizzes created by the admin.
    Falls back to all active quizzes if admin_user_id is unknown.
    """
    quizzes = get_active_quizzes()
    if not admin_user_id:
        return quizzes
    return [
        q for q in quizzes
        if str(q.get("createdBy", "")) == admin_user_id
    ]
