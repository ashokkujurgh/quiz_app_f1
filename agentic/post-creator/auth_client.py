"""
Obtain and cache a JWT access token from the auth service.
"""
import logging
import requests
from config import AUTH_API_URL, ADMIN_EMAIL, ADMIN_PASSWORD

logger = logging.getLogger(__name__)

_token: str | None = None


def get_token() -> str:
    global _token
    if _token:
        return _token
    resp = requests.post(
        f"{AUTH_API_URL}/api/admin/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    _token = data.get("accessToken") or data.get("token")
    logger.info("Admin token obtained.")
    return _token


def reset_token() -> None:
    global _token
    _token = None


def auth_headers() -> dict:
    return {"Authorization": f"Bearer {get_token()}"}


def upload_image(image: bytes, mime_type: str) -> str | None:
    """Upload image bytes to DigitalOcean Spaces via the auth service. Returns the CDN URL or None."""
    ext = mime_type.split("/")[-1].replace("jpeg", "jpg")
    for attempt in range(2):
        try:
            resp = requests.post(
                f"{AUTH_API_URL}/api/auth/upload/images",
                files={"images": (f"post.{ext}", image, mime_type)},
                headers=auth_headers(),
                timeout=60,
            )
            if resp.status_code == 401 and attempt == 0:
                reset_token()  # cached token expired — log in again and retry once
                continue
            resp.raise_for_status()
            urls = resp.json().get("urls") or []
            return urls[0] if urls else None
        except Exception as exc:
            logger.error("Image upload failed: %s", exc)
            return None
    return None
