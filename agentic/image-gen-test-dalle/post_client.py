"""
Save generated posts to the Meenzo post-service via REST API.
"""
import logging
import requests
from auth_client import auth_headers, reset_token
from config import POST_API_URL

logger = logging.getLogger(__name__)


def save_post(
    title: str | None,
    content: str,
    image_url: str | None,
    topic_name: str,
    subtopic_name: str,
    seo: dict | None = None,
) -> dict | None:
    """
    POST /api/posts — saves the generated post as the admin user.
    Returns the created post dict or None on failure.
    """
    if seo and image_url and not seo.get("ogImage"):
        seo["ogImage"] = image_url

    payload = {
        "title":          title,
        "content":        content,
        "topic":          topic_name,
        "subTopic":       subtopic_name,
        "authorName":     "Meenzo AI",
        "authorUsername": "meenzo_ai",
        "authorAvatar":   None,
        "timezone":       "Asia/Kolkata",
        "seo":            seo,
    }
    if image_url:
        payload["image"]  = image_url
        payload["images"] = [image_url]

    try:
        headers = {**auth_headers(), "Content-Type": "application/json"}
        resp = requests.post(
            f"{POST_API_URL}/api/posts",
            json=payload,
            headers=headers,
            timeout=30,
        )
        if resp.status_code == 401:
            reset_token()
            headers = {**auth_headers(), "Content-Type": "application/json"}
            resp = requests.post(
                f"{POST_API_URL}/api/posts",
                json=payload,
                headers=headers,
                timeout=30,
            )
        resp.raise_for_status()
        post = resp.json().get("post")
        logger.info("Post saved to MongoDB: %s", post.get("_id") if post else "?")
        return post
    except Exception as exc:
        logger.error("Failed to save post: %s", exc)
        return None
