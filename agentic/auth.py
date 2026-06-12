"""
Obtain and cache a JWT token from the admin auth service.
"""
import logging
import requests
from config import ADMIN_API_URL, ADMIN_EMAIL, ADMIN_PASSWORD

logger = logging.getLogger(__name__)

_token: str | None = None


def get_token() -> str:
    global _token
    if _token:
        return _token

    resp = requests.post(
        f"{ADMIN_API_URL}/api/admin/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=10,
    )
    resp.raise_for_status()
    _token = resp.json()["accessToken"]
    logger.info("Admin token obtained.")
    return _token


def reset_token() -> None:
    global _token
    _token = None


def auth_headers() -> dict:
    return {"Authorization": f"Bearer {get_token()}"}
