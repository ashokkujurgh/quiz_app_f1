"""
AI content generation: title, post content, image, embeddings.
"""
import logging
import json
import base64
import requests as _requests
from openai import OpenAI
from config import OPENAI_API_KEY, DALLE_API_KEY, EMBED_MODEL
from trending import INDIA_BIASED_SUBTOPICS, INDIA_50_SUBTOPICS, TRENDING_BIASED_SUBTOPICS

logger = logging.getLogger(__name__)

_gpt_client   = OpenAI(api_key=OPENAI_API_KEY)
_dalle_client = OpenAI(api_key=DALLE_API_KEY)


def _is_india_biased(subtopic_name: str) -> bool:
    return any(kw in subtopic_name.lower() for kw in INDIA_BIASED_SUBTOPICS)

def _is_india_50(subtopic_name: str) -> bool:
    return any(kw in subtopic_name.lower() for kw in INDIA_50_SUBTOPICS)

def _is_trending_biased(subtopic_name: str) -> bool:
    return any(kw in subtopic_name.lower() for kw in TRENDING_BIASED_SUBTOPICS)


def generate_title_and_content(
    topic_name: str,
    subtopic_name: str,
    trending_hint: str | None = None,
    web_context: str | None = None,
) -> dict | None:
    """
    Generate a post title, content, and SEO metadata.
    Returns { title, content, seo } or None on failure.
    """
    india_biased    = _is_india_biased(subtopic_name)
    india_50        = _is_india_50(subtopic_name)
    trending_biased = _is_trending_biased(subtopic_name)

    trend_clause = (
        f"\nTrending angle: Incorporate insights about '{trending_hint}' if relevant."
        if trending_hint else ""
    )

    context_clause = (
        f"\n\nResearch context (use as reference, do NOT copy verbatim):\n{web_context}"
        if web_context else ""
    )

    if india_50:
        india_clause = (
            f"\nIMPORTANT: Write exactly 50% of the content focused on India "
            f"(Indian achievements, Indian scientists/engineers, India-specific examples) "
            f"and 50% on global/world context and developments."
        )
    elif india_biased:
        india_clause = (
            f"\nIMPORTANT: Write 80% of the content focused on India "
            f"(Indian examples, Indian context, Indian {subtopic_name}) and 20% on global perspective."
        )
    else:
        india_clause = ""

    trending_clause = (
        f"\nIMPORTANT: This is a trending/current topic. Write 80% of the content around the LATEST "
        f"developments, recent breakthroughs, and current real-world events in {subtopic_name}. "
        f"Use the news headlines from the research context as primary angles. 20% can be foundational context."
        if trending_biased else ""
    )

    prompt = f"""You are an expert educational content writer for Meenzo, a modern quiz and learning platform for students and curious learners.

Topic: {topic_name}
Subtopic: {subtopic_name}{trend_clause}{india_clause}{trending_clause}{context_clause}

Write a highly engaging, modern educational post. Return ONLY valid JSON — no markdown, no extra text:

{{
  "title": "<punchy, curiosity-driven title that makes readers want to learn more, max 100 chars>",
  "content": "<rich educational post, 200-280 words. Structure: start with a surprising fact or a current news hook, then explain the concept clearly with vivid real-world examples, include 2-3 key insights or recent developments, end with a thought-provoking question or call-to-action. Use simple language, active voice, no markdown, no bullet points — flowing paragraphs only.>",
  "seo": {{
    "metaTitle": "<SEO title with primary keyword, max 60 chars>",
    "metaDescription": "<compelling description with keyword, max 155 chars>",
    "keywords": ["<keyword1>", "<keyword2>", "<keyword3>", "<keyword4>", "<keyword5>"],
    "ogTitle": "<social sharing title, engaging and shareable, max 90 chars>",
    "ogDescription": "<social sharing description, max 200 chars>",
    "ogImage": null,
    "canonical": null
  }}
}}

Quality rules:
- Open with a surprising fact, current statistic, or bold statement — never start with "Did you know".
- Base content on the research context (news headlines / Wikipedia) if provided.
- Use vivid analogies and real-world examples students can relate to.
- Write like a knowledgeable friend, not a textbook.
- SEO fields must be unique and click-worthy.
"""

    try:
        resp = _gpt_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_tokens=1100,
        )
        raw = resp.choices[0].message.content.strip()
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


def _extract_visual_scene(title: str, content: str, subtopic_name: str, topic_name: str) -> str:
    """Use GPT to extract a country-specific, unique visual scene from the post content."""
    try:
        resp = _gpt_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": (
                f"You are a photo director. Given this article title and content:\n\n"
                f"Title: {title}\nContent (first 500 chars): {content[:500]}\n\n"
                f"Step 1: Identify the PRIMARY country or region this article is about "
                f"(e.g. India, USA, Japan, Germany, Brazil). If no specific country, use the most relevant region.\n"
                f"Step 2: Describe ONE specific, vivid, photorealistic scene that best represents this article visually. "
                f"The scene MUST be clearly set in that country — use its recognisable landmarks, architecture, "
                f"landscapes, people's appearance, traditional or local clothing, and cultural context so the location "
                f"is immediately obvious from the photo. Be very specific: name real settings, real objects, real actions. "
                f"No generic stock-photo descriptions. Make it unique to THIS article.\n\n"
                f"Return ONLY a 2-3 sentence scene description that naturally includes the country/location. No extra text."
            )}],
            temperature=0.9,
            max_tokens=150,
        )
        return resp.choices[0].message.content.strip()
    except Exception:
        return f"{subtopic_name} in the context of {topic_name}"


def generate_image(title: str | None, subtopic_name: str, topic_name: str, content: str = "") -> str | None:
    """
    Generate 1 image via gpt-image-1, upload to CDN, return URL.
    """
    india_biased = _is_india_biased(subtopic_name)
    india_50     = _is_india_50(subtopic_name)
    if india_50:
        india_style = "blending Indian and global visual elements equally"
    elif india_biased:
        india_style = "with Indian visual elements, warm colours, and culturally relevant imagery"
    else:
        india_style = ""

    scene = _extract_visual_scene(title or subtopic_name, content, subtopic_name, topic_name) if content else f"{subtopic_name} in the context of {topic_name}"

    image_prompt = (
        f"A high-quality, photorealistic editorial photograph. {scene} {india_style} "
        f"Style: professional DSLR photography, natural lighting, sharp focus, realistic textures, "
        f"cinematic composition, documentary feel. Real people, real environments, real objects — "
        f"no illustrations, no cartoons, no flat design, no CGI, no text overlays. "
        f"Shot like a National Geographic or BBC feature photo."
    )

    try:
        resp = _dalle_client.images.generate(
            model="gpt-image-1",
            prompt=image_prompt,
            size="1024x1024",
            n=1,
        )
        item = resp.data[0] if resp.data else None
        if not item:
            logger.error("Image generation returned no data.")
            return None

        if item.b64_json:
            img_bytes = base64.b64decode(item.b64_json)
            from config import AUTH_API_URL
            from auth_client import auth_headers
            upload_resp = _requests.post(
                f"{AUTH_API_URL}/api/auth/upload/image",
                files={"image": ("image.png", img_bytes, "image/png")},
                headers=auth_headers(),
                timeout=60,
            )
            if upload_resp.ok:
                url = upload_resp.json().get("url")
                if url:
                    logger.info("Image uploaded: %s", url[:60])
                    return url
            else:
                logger.error("Image upload failed: %s", upload_resp.text[:200])

        if item.url:
            logger.info("Image URL: %s", item.url[:60])
            return item.url

    except Exception as exc:
        logger.error("Image generation failed: %s", exc)

    return None


def embed_text(text: str) -> list[float]:
    """Return a 1536-dim embedding for the given text."""
    resp = _gpt_client.embeddings.create(model=EMBED_MODEL, input=text[:8000])
    return resp.data[0].embedding
