"""
AI content generation with four human-like post modes:
  trending  (40%) — news-hooked, current events angle
  basic     (40%) — clear educational explainer, real-world examples
  fun       (10%) — witty, light-hearted, meme-energy but still informative
  question  (10%) — thought-provoking question that sparks debate/discussion
"""
import logging
import json
import random
from openai import OpenAI
from config import OPENAI_API_KEY, EMBED_MODEL
from trending import INDIA_BIASED_SUBTOPICS, INDIA_50_SUBTOPICS, TRENDING_BIASED_SUBTOPICS

logger = logging.getLogger(__name__)

_client = OpenAI(api_key=OPENAI_API_KEY)

# ── post mode weights ─────────────────────────────────────────────────────────
POST_MODES   = ["trending", "basic", "fun", "question"]
MODE_WEIGHTS = [0.40,       0.40,   0.10, 0.10]


def pick_post_mode() -> str:
    return random.choices(POST_MODES, weights=MODE_WEIGHTS, k=1)[0]


def _is_india_biased(subtopic_name: str) -> bool:
    return any(kw in subtopic_name.lower() for kw in INDIA_BIASED_SUBTOPICS)

def _is_india_50(subtopic_name: str) -> bool:
    return any(kw in subtopic_name.lower() for kw in INDIA_50_SUBTOPICS)

def _is_trending_biased(subtopic_name: str) -> bool:
    return any(kw in subtopic_name.lower() for kw in TRENDING_BIASED_SUBTOPICS)


# ── per-mode system prompts ───────────────────────────────────────────────────

_SYSTEM_TRENDING = """\
You write posts for Meenzo, a quiz and learning app popular with Indian students and curious learners.
Your job: write a SHORT, punchy post tied to a REAL news story or current event.

Voice: You sound like a smart friend who just read the news and can't stop talking about it.
Tone: excited but credible — like a knowledgeable college senior explaining something over chai.
Rules:
- Start with the news hook (what happened, when, why it matters) — ONE sentence max.
- Then connect it to the broader topic in a way that teaches something.
- Never say "Did you know", "In today's world", "In conclusion", or use bullet points.
- Active voice. Short sentences. No jargon without explanation.
- End with one sentence that makes the reader feel smarter for reading this.
- Length: 160-220 words. Flowing paragraphs, no lists."""

_SYSTEM_BASIC = """\
You write posts for Meenzo, a quiz and learning app popular with Indian students and curious learners.
Your job: write a CLEAR, engaging educational post that explains a concept in a way anyone can understand.

Voice: Like a really good teacher who actually makes class interesting — warm, direct, zero fluff.
Tone: confident but approachable, like explaining to a smart 16-year-old.
Rules:
- Open with a surprising fact, an analogy, or a concrete real-world example — never a definition.
- Explain the concept through stories or comparisons, not textbook language.
- Include one specific real-world example that sticks (India-relevant where possible).
- Never say "Did you know", "In conclusion", or use bullet points.
- Active voice. Write like a human, not a Wikipedia article.
- End with one memorable line that makes the concept click.
- Length: 180-240 words. Flowing paragraphs."""

_SYSTEM_FUN = """\
You write posts for Meenzo, a quiz and learning app popular with Indian students and curious learners.
Your job: write a FUNNY, witty post about a topic that also secretly teaches something.

Voice: Like a stand-up comedian who also happens to have a PhD — sharp, playful, self-aware.
Tone: light-hearted, a little irreverent, definitely not corporate. Think Twitter/X energy meets actual knowledge.
Rules:
- Open with a funny observation, absurd comparison, or relatable student struggle related to the topic.
- Sneak in 2-3 real facts or insights disguised as jokes or commentary.
- Can use mild sarcasm, pop culture references, or India-specific humour (exams, traffic, cricket, chai).
- Never lecture. Never be cringe. No "haha" or "lol" — let the writing be the funny part.
- End with a punchline or a playful twist that makes people want to share it.
- Length: 130-180 words. Punchy, flowing. No bullet points."""

_SYSTEM_QUESTION = """\
You write posts for Meenzo, a quiz and learning app popular with Indian students and curious learners.
Your job: write a THOUGHT-PROVOKING post that asks a big question and gets people thinking and debating.

Voice: Like a philosophy professor who also watches way too much news — curious, open, a little provocative.
Tone: honest, slightly controversial in a harmless way, intellectually exciting.
Rules:
- Open by framing an interesting dilemma, paradox, or surprising question about the topic.
- Give 2-3 angles or perspectives — don't answer it definitively. Let the reader decide.
- Use India-relevant context where natural (but don't force it).
- End with the actual question directed at the reader — make them WANT to comment or think.
- Never say "In conclusion", never be preachy, never lecture.
- Active voice. Short paragraphs. 150-200 words. No bullet points."""


def _india_clause(subtopic_name: str) -> str:
    if _is_india_50(subtopic_name):
        return (
            "\nINDIA MIX: Blend Indian examples and global context equally (50/50). "
            "Name real Indian places, scientists, companies, or events where relevant."
        )
    elif _is_india_biased(subtopic_name):
        return (
            "\nINDIA FOCUS: 80% of examples and context should be India-specific "
            "(Indian cities, people, policies, achievements). 20% global comparison."
        )
    return ""


def _context_clause(web_context: str | None, trending_news: list[dict] | None, mode: str) -> str:
    parts = []

    if trending_news and mode in ("trending", "question"):
        news_lines = "\n".join(
            f"• {h['title']}" + (f": {h['summary'][:200]}" if h.get("summary") else "")
            for h in trending_news[:5]
        )
        parts.append(f"TRENDING NEWS (use as primary hook for this post):\n{news_lines}")

    if web_context:
        parts.append(f"BACKGROUND REFERENCE (use for facts, do NOT copy verbatim):\n{web_context[:800]}")

    if not parts:
        return ""
    return "\n\n" + "\n\n".join(parts)


# ── main generation function ──────────────────────────────────────────────────

def generate_post(
    topic_name: str,
    subtopic_name: str,
    mode: str,
    trending_news: list[dict] | None = None,
    web_context: str | None = None,
    trending_hint: str | None = None,
) -> dict | None:
    """
    Generate a post with the given mode.
    Returns { title, content, seo, mode } or None on failure.
    """
    system_map = {
        "trending": _SYSTEM_TRENDING,
        "basic":    _SYSTEM_BASIC,
        "fun":      _SYSTEM_FUN,
        "question": _SYSTEM_QUESTION,
    }
    system_prompt = system_map.get(mode, _SYSTEM_BASIC)

    india_note   = _india_clause(subtopic_name)
    context_note = _context_clause(web_context, trending_news, mode)

    trend_note = ""
    if trending_hint and mode == "trending":
        trend_note = f"\nTrending angle to incorporate: {trending_hint}"

    mode_title_hints = {
        "trending": "news-hook title that makes people click (e.g. 'This just changed everything about X')",
        "basic":    "clear, curiosity-driven title (e.g. 'Why X actually works like Y')",
        "fun":      "witty, slightly clickbaity title with personality (e.g. 'X explained by someone who gets it')",
        "question": "question title that makes people stop scrolling (e.g. 'Is X really Y? Here's the debate.')",
    }
    title_hint = mode_title_hints.get(mode, "engaging title")

    user_prompt = f"""Topic: {topic_name}
Subtopic: {subtopic_name}
Post mode: {mode.upper()}{india_note}{trend_note}{context_note}

Write a {mode} post about "{subtopic_name}" under the topic "{topic_name}".
Title should be a {title_hint}.

Return ONLY valid JSON — no markdown, no code fences:

{{
  "title": "<{title_hint}, max 100 chars>",
  "content": "<post body — see system instructions for length and rules>",
  "seo": {{
    "metaTitle": "<SEO title with primary keyword, max 60 chars>",
    "metaDescription": "<compelling meta description, max 155 chars>",
    "keywords": ["<kw1>", "<kw2>", "<kw3>", "<kw4>", "<kw5>"],
    "ogTitle": "<social sharing title, max 90 chars>",
    "ogDescription": "<social sharing description, max 200 chars>",
    "ogImage": null,
    "canonical": null
  }}
}}"""

    try:
        resp = _client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature=0.85,
            max_tokens=1200,
        )
        raw = resp.choices[0].message.content.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        assert isinstance(data.get("content"), str) and len(data["content"]) > 50
        data["mode"] = mode
        return data
    except Exception as exc:
        logger.error("[%s] Content generation failed: %s", mode, exc)
        return None


# kept for backward compatibility — wraps generate_post in "basic" mode
def generate_title_and_content(
    topic_name: str,
    subtopic_name: str,
    trending_hint: str | None = None,
    web_context: str | None = None,
) -> dict | None:
    return generate_post(
        topic_name=topic_name,
        subtopic_name=subtopic_name,
        mode="basic",
        web_context=web_context,
        trending_hint=trending_hint,
    )


def embed_text(text: str) -> list[float]:
    resp = _client.embeddings.create(model=EMBED_MODEL, input=text[:8000])
    return resp.data[0].embedding


def generate_image(*args, **kwargs) -> None:
    """Image generation is currently disabled."""
    return None
