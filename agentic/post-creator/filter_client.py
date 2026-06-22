"""
Thin client for the post-filter microservice.
"""
import logging
import requests
from config import FILTER_API_URL

logger = logging.getLogger(__name__)


def is_content_allowed(content: str, image_url: str | None = None) -> tuple[bool, str | None]:
    """
    Returns (allowed, reason).
    Fails open (returns True) if the filter service is unreachable.
    """
    try:
        resp = requests.post(
            f"{FILTER_API_URL}/filter",
            json={"content": content, "image_url": image_url},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("allowed", True), data.get("reason")
    except Exception as exc:
        logger.warning("Filter service unreachable, failing open: %s", exc)
        return True, None
