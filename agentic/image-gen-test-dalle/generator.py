"""
AI content generation (Google Gemini): title, post content, image, embeddings.
"""
import logging
import json
import os
import tempfile
import requests as _requests
from google import genai
from google.genai import types
from config import GEMINI_API_KEY, CHAT_MODEL, IMAGE_MODELS, EMBED_MODEL, EMBED_DIM

logger = logging.getLogger(__name__)

_client = genai.Client(api_key=GEMINI_API_KEY)


def generate_title_and_content(
    topic_name: str,
    subtopic_name: str,
    trending_hint: str | None = None,
) -> dict | None:
    """
    Generate a post title, content, and SEO metadata for the given subtopic.
    Returns { title, content, seo } or None on failure.
    """
    trend_clause = (
        f"\nTrending angle: '{trending_hint}' — relate this real-world topic to {subtopic_name} if relevant."
        if trending_hint else ""
    )

    prompt = f"""You are an expert educational content writer and SEO specialist for Meenzo, a quiz and learning platform.

Topic: {topic_name}
Subtopic: {subtopic_name}{trend_clause}

Write an engaging educational post AND its SEO metadata. Return ONLY valid JSON — no markdown, no extra text:

{{
  "title": "<catchy, informative post title, max 100 chars — or null if no suitable title>",
  "content": "<educational post content, 150-300 words, friendly and insightful tone. Include key facts, a real-world example or analogy, end with a thought-provoking question or call to action. No markdown.>",
  "seo": {{
    "metaTitle": "<SEO page title, include primary keyword, max 60 chars>",
    "metaDescription": "<compelling meta description that includes the primary keyword and encourages clicks, max 155 chars>",
    "keywords": ["<keyword1>", "<keyword2>", "<keyword3>", "<keyword4>", "<keyword5>"],
    "ogTitle": "<Open Graph title for social sharing, engaging, max 90 chars>",
    "ogDescription": "<Open Graph description for social sharing, max 200 chars>",
    "ogImage": null,
    "canonical": null
  }}
}}

Rules:
- Title and content must be factually accurate.
- SEO keywords must be relevant to {subtopic_name} and {topic_name}.
- metaTitle and metaDescription must be unique and click-worthy.
- ogTitle can be slightly more casual/engaging than metaTitle.
- Write for a general educated audience.
"""
    try:
        resp = _client.models.generate_content(
            model=CHAT_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.75,
                response_mime_type="application/json",
            ),
        )
        raw = resp.text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        assert isinstance(data.get("content"), str) and data["content"]
        assert isinstance(data.get("seo"), dict)
        return data
    except Exception as exc:
        logger.error("Title/content generation failed: %s", exc)
        return None


def generate_image(title: str | None, subtopic_name: str, topic_name: str) -> str | None:
    """
    Generate 1 image for the post, trying models in order of preference.
    Returns the image URL or None on failure.
    """
    image_prompt = (
        f"A clean, professional educational illustration for a learning platform post titled "
        f"'{title or subtopic_name}'. Subject: {subtopic_name} in {topic_name}. "
        f"Style: modern flat design, bright colors, no text overlays, suitable for all ages."
    )

    for model in IMAGE_MODELS:
        try:
            resp = _client.models.generate_content(
                model=model,
                contents=image_prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                    image_config=types.ImageConfig(aspect_ratio="1:1"),
                ),
            )
            image = next((p.inline_data for p in resp.parts or [] if p.inline_data and p.inline_data.data), None)
            if not image:
                continue

            # Gemini returns raw image bytes — upload to the post-service so we get a persistent URL
            mime = image.mime_type or "image/png"
            ext = mime.split("/")[-1]
            from config import POST_API_URL
            from auth_client import auth_headers
            upload_resp = _requests.post(
                f"{POST_API_URL}/api/auth/upload/images",
                files={"images": (f"image.{ext}", image.data, mime)},
                headers=auth_headers(),
                timeout=60,
            )
            if upload_resp.ok:
                urls = upload_resp.json().get("urls", [])
                if urls:
                    logger.info("Image generated via %s (bytes→upload)", model)
                    return urls[0]

        except Exception as exc:
            logger.warning("Image generation failed with %s: %s", model, exc)

    logger.error("All image generation models failed.")
    return None


def embed_text(text: str) -> list[float]:
    """Return a 1536-dim embedding for the given text."""
    resp = _client.models.embed_content(
        model=EMBED_MODEL,
        contents=text[:8000],
        config=types.EmbedContentConfig(output_dimensionality=EMBED_DIM),
    )
    return resp.embeddings[0].values
