"""
Handles registration, login, and token caching for all 10 bot players.
Also fetches the admin user ID so quizzes can be filtered by creator.
"""
import logging
import requests
from config import AUTH_SERVICE_URL, ADMIN_API_URL, ADMIN_EMAIL, ADMIN_PASSWORD, PLAYER_USERS

logger = logging.getLogger(__name__)

# email → JWT access token
_tokens: dict[str, str] = {}

# cached admin user ID (MongoDB ObjectId string)
_admin_user_id: str | None = None


# ── Admin ──────────────────────────────────────────────────────────────────────

def get_admin_user_id() -> str | None:
    """Login as admin and return the admin's user ID."""
    global _admin_user_id
    if _admin_user_id:
        return _admin_user_id
    try:
        resp = requests.post(
            f"{ADMIN_API_URL}/api/admin/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10,
        )
        if resp.ok:
            data = resp.json()
            # Try both possible response shapes
            _admin_user_id = (
                data.get("user", {}).get("_id")
                or data.get("admin", {}).get("_id")
                or data.get("_id")
            )
            if _admin_user_id:
                logger.info("Admin user ID: %s", _admin_user_id)
            else:
                logger.warning("Could not parse admin ID from response: %s", data)
        else:
            logger.warning("Admin login failed: %s", resp.text)
    except Exception as exc:
        logger.error("get_admin_user_id error: %s", exc)
    return _admin_user_id


# ── Players ────────────────────────────────────────────────────────────────────

def _register(user: dict) -> bool:
    """Register a bot player. Returns True if newly created, False if already exists."""
    try:
        resp = requests.post(
            f"{AUTH_SERVICE_URL}/api/auth/register",
            json={"name": user["name"], "email": user["email"], "password": user["password"]},
            timeout=10,
        )
        if resp.status_code in (200, 201):
            logger.info("  ✓ Created user: %s (%s)", user["name"], user["email"])
            return True
        elif resp.status_code == 409:
            logger.info("  • Already exists: %s (%s)", user["name"], user["email"])
            return False
        else:
            logger.warning("  ✗ Register failed for %s: %s", user["email"], resp.text)
            return False
    except Exception as exc:
        logger.error("  ✗ Register error for %s: %s", user["email"], exc)
        return False


def _login(user: dict) -> str | None:
    """Login a bot player and cache their token. Returns token or None."""
    try:
        resp = requests.post(
            f"{AUTH_SERVICE_URL}/api/auth/login",
            json={"email": user["email"], "password": user["password"]},
            timeout=10,
        )
        if resp.ok:
            token = resp.json().get("accessToken")
            if token:
                _tokens[user["email"]] = token
                return token
        logger.error("Login failed for %s: %s %s", user["email"], resp.status_code, resp.text)
    except Exception as exc:
        logger.error("Login error for %s: %s", user["email"], exc)
    return None


def create_all_players() -> None:
    """
    Register all 10 bot players (idempotent) then log them all in.
    Called once at startup — prints a clear summary table.
    """
    logger.info("=" * 55)
    logger.info("Creating 15 AI player accounts  (10 Indian + 5 Foreign)...")
    logger.info("=" * 55)

    created = 0
    logged_in = 0

    for user in PLAYER_USERS:
        if _register(user):
            created += 1
        if _login(user):
            logged_in += 1

    logger.info("=" * 55)
    logger.info(
        "Done — %d new accounts created, %d/15 logged in.",
        created, logged_in,
    )
    logger.info("=" * 55)


def get_token(email: str) -> str | None:
    if email not in _tokens:
        user = next((u for u in PLAYER_USERS if u["email"] == email), None)
        if user:
            _login(user)
    return _tokens.get(email)


def refresh_token(email: str) -> str | None:
    """Re-login to get a fresh token after a 401."""
    _tokens.pop(email, None)
    user = next((u for u in PLAYER_USERS if u["email"] == email), None)
    return _login(user) if user else None
