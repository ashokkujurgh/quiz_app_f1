"""
Save generated posts to the Meenzo post-service via REST API.
Uses the internal service-to-service endpoint (no user JWT required).
"""
import logging
import os
import requests
from config import POST_API_URL

logger = logging.getLogger(__name__)

INTERNAL_SECRET = os.getenv("INTERNAL_SERVICE_SECRET", "internal-quiz-secret")
ADMIN_USER_ID   = os.getenv("ADMIN_USER_ID", "")


def save_post(
    title: str | None,
    content: str,
    image_url: str | None,
    topic_name: str,
    subtopic_name: str,
    seo: dict | None = None,
) -> dict | None:
    if seo and image_url and not seo.get("ogImage"):
        seo["ogImage"] = image_url

    payload = {
        "title":          title,
        "content":        content,
        "topic":          topic_name,
        "subTopic":       subtopic_name,
        "authorName":     "Meenzo",
        "authorUsername": "meenzo",
        "authorAvatar":   None,
        "authorUserId":   ADMIN_USER_ID or None,
        "seo":            seo,
    }
    if image_url:
        payload["image"]  = image_url
        payload["images"] = [image_url]

    try:
        resp = requests.post(
            f"{POST_API_URL}/api/posts/internal",
            json=payload,
            headers={
                "x-internal-secret": INTERNAL_SECRET,
                "Content-Type": "application/json",
            },
            timeout=30,
        )
        resp.raise_for_status()
        post = resp.json().get("post")
        logger.info("Post saved to MongoDB: %s", post.get("_id") if post else "?")
        return post
    except Exception as exc:
        logger.error("Failed to save post: %s", exc)
        return None
