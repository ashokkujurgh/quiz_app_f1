"""
AI content generation with four human-like post modes:
  trending  (30%) — news-hooked, current events angle
  basic     (50%) — clear educational explainer, real-world examples
  fun       (10%) — witty, light-hearted, meme-energy but still informative
  question  (10%) — thought-provoking question that sparks debate/discussion

Each post also gets a reading level, independent of mode:
  foundation (70%) — high-school / job-seeker level, no jargon left unexplained
  advanced   (30%) — assumes the reader already knows the subject's fundamentals
"""
import logging
import json
import random
import os
import shutil
import subprocess
import tempfile
import time
import requests
from google import genai
from google.genai import types
from config import (
    GEMINI_API_KEY, CHAT_MODEL, EMBED_MODEL, EMBED_DIM, IMAGE_MODELS,
    KIE_API_KEY, KIE_API_URL, KIE_IMAGE_MODEL, KIE_TIMEOUT_SECONDS,
    OPENART_ENABLED, OPENART_IMAGE_MODEL, OPENART_TIMEOUT,
)
from trending import INDIA_BIASED_SUBTOPICS, INDIA_50_SUBTOPICS, TRENDING_BIASED_SUBTOPICS

logger = logging.getLogger(__name__)

_client = genai.Client(api_key=GEMINI_API_KEY)

# ── post mode weights ─────────────────────────────────────────────────────────
# trending = current-affairs-hooked posts (kept to 30% so the feed doesn't read like a news app)
POST_MODES   = ["trending", "basic", "fun", "question"]
MODE_WEIGHTS = [0.30,       0.50,   0.10, 0.10]


def pick_post_mode() -> str:
    return random.choices(POST_MODES, weights=MODE_WEIGHTS, k=1)[0]


# ── reading-level weights ──────────────────────────────────────────────────────
# Meenzo's audience is mainly job-seekers/exam aspirants, not subject specialists —
# so most posts should read at a high-school / plain-language level, with a
# smaller share going deeper for readers who already know the fundamentals.
LEVELS        = ["foundation", "advanced"]
LEVEL_WEIGHTS = [0.70,          0.30]


def pick_level() -> str:
    return random.choices(LEVELS, weights=LEVEL_WEIGHTS, k=1)[0]


# ── region weights ─────────────────────────────────────────────────────────────
# india (30%) — India-centred story and examples
# world (70%) — international current affairs, non-Indian examples
REGIONS        = ["india", "world"]
REGION_WEIGHTS = [0.30,    0.70]


def pick_region() -> str:
    return random.choices(REGIONS, weights=REGION_WEIGHTS, k=1)[0]


def _is_india_biased(subtopic_name: str) -> bool:
    return any(kw in subtopic_name.lower() for kw in INDIA_BIASED_SUBTOPICS)

def _is_india_50(subtopic_name: str) -> bool:
    return any(kw in subtopic_name.lower() for kw in INDIA_50_SUBTOPICS)

def _is_trending_biased(subtopic_name: str) -> bool:
    return any(kw in subtopic_name.lower() for kw in TRENDING_BIASED_SUBTOPICS)


# ── per-mode system prompts ───────────────────────────────────────────────────

_QUALITY_BAR = """
QUALITY BAR (applies no matter the mode):
- Every paragraph must add a NEW concrete fact, example, name, date, or mechanism. Never pad by restating the same point in different words.
- You may use ONE analogy/metaphor for the whole post, and it must appear ONLY in the opening paragraph (to hook the reader) and optionally one callback in the final sentence. Every paragraph in between must contain ZERO comparison language ("like a", "similar to", "akin to", "just like", "think of it as") — pure facts and explanation only, no metaphor-of-the-day for each new sub-point.
- NEVER open with a made-up hypothetical scene ("Imagine you are...", "Picture yourself...", "Imagine standing in..."). Open with something REAL and specific instead — an actual fact, event, statistic, named person, or place that genuinely happened.
- Ground claims in specifics: real names, real numbers, real events, real institutions. Avoid vague filler and generic hype phrases.
- Don't use rhetorical filler questions as transitions (e.g. "But what does this mean?"). Only pose a question when it is the actual point being made.
- Title must reference a SPECIFIC fact, name, place, or number that actually appears in the post content — never a generic template like "How X Shapes Our Lives" or "Why X is Like Y". Every title should be different in structure from the last, not a repeated formula.
- Write for a reader who should genuinely understand and remember the subject a week later — not just enjoy reading it once."""

_SYSTEM_TRENDING = """\
You write posts for Meenzo, a quiz and learning app popular with Indian students and curious learners.
Your job: write a post that uses a recent news event as a HOOK to deeply explain a core subject concept.

Voice: You sound like a smart friend who just read the news and immediately connected it to something they studied.
Tone: excited but educational — the news is the door, the core concept is the room. This is a learning post, NOT a news report.
Rules:
- Start with the news hook in ONE sentence only, then pivot immediately to teaching the underlying concept.
- Spend at least 90% of the post teaching the core subject in depth (theory, principles, history, how it works, real examples) — this must read like solid textbook/exam-prep knowledge, not a news summary.
- Do not recap, analyse, or editorialise the news event itself beyond that opening sentence — it is only a doorway in.
- Use analogies and examples that fit the REGION FOCUS in the request to make it vivid.
- Never say "Did you know", "In today's world", "In conclusion", or use bullet points.
- Active voice. No jargon without explanation.
- End with one sentence that makes the reader feel smarter for reading this.
- Length: 500-1000 words. Multiple flowing paragraphs. No lists or headers.
""" + _QUALITY_BAR

_SYSTEM_BASIC = """\
You write posts for Meenzo, a quiz and learning app popular with Indian students and curious learners.
Your job: write a DEEP, engaging educational post that thoroughly explains a core subject concept.

Voice: Like a really good teacher who actually makes class interesting — warm, direct, zero fluff.
Tone: confident but approachable, like explaining to a smart 16-year-old who wants to truly understand.
Rules:
- Open with a surprising REAL fact, statistic, or a concrete real-world example that actually happened — never a definition, news hook, or a made-up hypothetical scenario.
- Build understanding layer by layer — start simple, go deeper, cover history/theory/application.
- Include multiple real-world examples, drawn from the REGION FOCUS in the request.
- Explain WHY the concept matters, not just WHAT it is.
- Never say "Did you know", "In conclusion", or use bullet points or headers.
- Active voice. Write like a human, not a Wikipedia article or news report.
- End with one memorable line that makes the concept truly click.
- Length: 500-1000 words. Rich, flowing paragraphs. This is a proper learning article, not a summary.
""" + _QUALITY_BAR

_SYSTEM_FUN = """\
You write posts for Meenzo, a quiz and learning app popular with Indian students and curious learners.
Your job: write a FUNNY, witty post that secretly teaches a core subject concept in depth.

Voice: Like a stand-up comedian who also happens to have a PhD — sharp, playful, deeply knowledgeable.
Tone: light-hearted, irreverent, definitely not corporate. Think detailed explainer meets comedy writing.
Rules:
- Open with ONE funny observation, absurd comparison, or relatable student struggle related to the SUBJECT (not news) — then let it go. Do not keep reusing the same joke/analogy as a callback in every paragraph; that reads as padding, not wit.
- The humour must come from a genuinely clever insight about the subject itself, not from stacking unrelated pop-culture references or forced puns.
- Build up to explaining the full concept through real substance — facts, history, principles, concrete examples — humour is the seasoning, not the meal.
- At most one light cultural touch from the REGION FOCUS for the whole post — don't repeat it as a running gag.
- Never lecture. Never be cringe. No "haha" or "lol", no rhetorical "spoiler:" asides — let the writing be the funny part.
- End with a punchline or playful twist that still leaves the reader having learned something real.
- Length: 500-1000 words. Punchy paragraphs but substantial depth. No bullet points.
""" + _QUALITY_BAR

_SYSTEM_QUESTION = """\
You write posts for Meenzo, a quiz and learning app popular with Indian students and curious learners.
Your job: write a THOUGHT-PROVOKING post that explores a big question around a core subject concept.

Voice: Like a philosophy professor who has mastered the subject — curious, open, intellectually rigorous.
Tone: honest, slightly provocative, deeply educational.
Rules:
- Open by framing an interesting dilemma, paradox, or surprising question rooted in the SUBJECT ITSELF (not current events).
- Explore 3-4 angles or perspectives in depth — explain the theory, the debate, the history behind each view.
- Use context from the REGION FOCUS in the request (but don't force it).
- End with the question directed at the reader — make them WANT to think, discuss, and learn more.
- Never say "In conclusion", never be preachy, never use news as the main frame.
- Active voice. Substantial paragraphs. 500-1000 words. No bullet points.
""" + _QUALITY_BAR


_LEVEL_FOUNDATION = """

READING LEVEL: FOUNDATION (high-school student / job-seeker studying for exams, no specialist background in this subject).
- The instant a technical term appears, explain it in one plain-language clause — never assume the reader has studied this subject before.
- Prefer short, direct sentences over long specialist ones. If a concept needs a formula, number, or technical name, give its plain-English meaning right next to it.
- Examples must be everyday and concrete — things a 10th-12th grade student or exam aspirant would recognize — not research-paper-level specifics or insider references.
- Depth still matters: go deep on WHY and HOW, but build that depth through clear step-by-step explanation, not through denser vocabulary."""

_LEVEL_ADVANCED = """

READING LEVEL: ADVANCED (reader already knows the fundamentals of this subject).
- You may use precise domain/technical terminology without pausing to define the basics.
- Go deeper into mechanisms, edge cases, technical nuance, or specialist debate than a beginner post would.
- Still ground everything in concrete facts and examples — advanced means more precise, not more abstract."""


def _level_clause(level: str) -> str:
    return _LEVEL_ADVANCED if level == "advanced" else _LEVEL_FOUNDATION


def _region_clause(subtopic_name: str, region: str) -> str:
    if region == "world":
        return (
            "\nREGION FOCUS — WORLD: Draw the hook and the examples from international / world current affairs. "
            "Use real events, countries, people, companies and institutions from outside India "
            "(e.g. US, Europe, China, Middle East, Africa, Latin America, global bodies). "
            "Do not make India the subject; mention India at most once, and only if genuinely essential."
        )
    if _is_india_50(subtopic_name) or not _is_india_biased(subtopic_name):
        return (
            "\nREGION FOCUS — INDIA: Build this post around India — Indian events, places, people, "
            "policies, companies and achievements. A brief global comparison is fine."
        )
    return _india_clause(subtopic_name)


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
    level: str = "foundation",
    trending_news: list[dict] | None = None,
    web_context: str | None = None,
    trending_hint: str | None = None,
    region: str = "world",
) -> dict | None:
    """
    Generate a post with the given mode, reading level and region ("india" / "world").
    Returns { title, content, seo, mode, level } or None on failure.
    """
    system_map = {
        "trending": _SYSTEM_TRENDING,
        "basic":    _SYSTEM_BASIC,
        "fun":      _SYSTEM_FUN,
        "question": _SYSTEM_QUESTION,
    }
    system_prompt = system_map.get(mode, _SYSTEM_BASIC) + _level_clause(level)

    india_note   = _region_clause(subtopic_name, region)
    context_note = _context_clause(web_context, trending_news, mode)

    trend_note = ""
    if trending_hint and mode == "trending":
        trend_note = f"\nTrending angle to incorporate: {trending_hint}"

    mode_title_hints = {
        "trending": "title built around the SPECIFIC news event/name/number from the hook — not a generic template",
        "basic":    "title built around the SPECIFIC fact, name, or example the post opens with — not a generic 'How X Shapes/Impacts...' template",
        "fun":      "witty title tied to the SPECIFIC angle of this post — not a generic 'X is Like Y' template",
        "question": "the actual specific question this post explores, in the reader's words — not a generic template",
    }
    title_hint = mode_title_hints.get(mode, "engaging title")

    user_prompt = f"""Topic: {topic_name}
Subtopic: {subtopic_name}
Post mode: {mode.upper()}{india_note}{trend_note}{context_note}

Write a {mode} post about the CORE SUBJECT "{subtopic_name}" under the topic "{topic_name}".
The post must focus on teaching this subject deeply — not on current events or news.
Title should be a {title_hint}.
IMPORTANT: The content must be 500-1000 words. Do not write less than 500 words.

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

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user",   "content": user_prompt},
    ]

    try:
        data = _generate_once(messages)
        for attempt in range(2):
            violations = _quality_violations(data["content"])
            if not violations:
                break
            logger.warning("[%s] Quality check failed (%s) — requesting rewrite (%d/2).", mode, "; ".join(violations), attempt + 1)
            messages.append({"role": "assistant", "content": json.dumps(data)})
            messages.append({"role": "user", "content": (
                "Your draft breaks these rules: " + "; ".join(violations) + ". "
                "Rewrite the ENTIRE post: use your single strongest analogy ONLY in the opening paragraph "
                "(and optionally a one-line callback at the very end) — every paragraph in between must have "
                "ZERO comparison language and contain only facts, examples, and explanation. If it opened with a "
                "made-up hypothetical scene, replace that opener with a real, specific, verifiable fact, event, "
                "or statistic instead. Remove any banned phrase entirely. Make the title reference a specific "
                "fact/name from the content, not a generic template. Keep the same length and JSON format."
            )})
            data = _generate_once(messages)
        else:
            remaining = _quality_violations(data["content"])
            if remaining:
                logger.warning("[%s] Still has issues after 2 rewrites (%s) — using it anyway.", mode, "; ".join(remaining))

        word_count = len(data["content"].split())
        logger.info("[%s/%s] Generated %d words for content.", mode, level, word_count)
        data["mode"] = mode
        data["level"] = level
        return data
    except Exception as exc:
        logger.error("[%s] Content generation failed: %s", mode, exc)
        return None


_ANALOGY_MARKERS  = ["like a ", "like the ", "similar to", "akin to", "just like", "think of it as"]
_BANNED_PHRASES   = ["in conclusion", "in summary", "to conclude", "in today's world", "did you know"]
_HYPOTHETICAL_OPENERS = ["imagine you", "imagine standing", "imagine a world", "imagine a", "picture yourself", "picture this"]


def _quality_violations(content: str) -> list[str]:
    text = content.lower()
    violations = []
    opener = text[:200]
    if any(phrase in opener for phrase in _HYPOTHETICAL_OPENERS):
        violations.append("opens with a made-up hypothetical scene instead of a real fact/event")
    for phrase in _BANNED_PHRASES:
        if phrase in text:
            violations.append(f'contains banned phrase "{phrase}"')
    analogy_count = sum(text.count(marker) for marker in _ANALOGY_MARKERS)
    if analogy_count > 2:
        violations.append(f"stacks {analogy_count} separate analogies instead of using one central analogy")
    return violations


def _generate_once(messages: list[dict]) -> dict:
    # Gemini takes the system prompt separately and calls the assistant role "model"
    system = "\n\n".join(m["content"] for m in messages if m["role"] == "system")
    contents = [
        types.Content(
            role="model" if m["role"] == "assistant" else "user",
            parts=[types.Part(text=m["content"])],
        )
        for m in messages if m["role"] != "system"
    ]
    resp = _client.models.generate_content(
        model=CHAT_MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=system or None,
            temperature=0.85,
            response_mime_type="application/json",
        ),
    )
    raw = resp.text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    # Parse the first JSON object only — the model sometimes appends extra text after it
    data, _ = json.JSONDecoder().raw_decode(raw.strip())
    assert isinstance(data.get("content"), str) and len(data["content"].strip()) >= 200, \
        "Content too short or missing"
    return data


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
    resp = _client.models.embed_content(
        model=EMBED_MODEL,
        contents=text[:8000],
        config=types.EmbedContentConfig(output_dimensionality=EMBED_DIM),
    )
    return resp.embeddings[0].values


def _openart_available() -> bool:
    creds = os.path.expanduser("~/.openart/cli-credentials.json")
    return OPENART_ENABLED and shutil.which("openart") is not None and os.path.exists(creds)


def _openart_generate_image(prompt: str) -> tuple[bytes, str] | None:
    """Generate via the OpenArt CLI (uses the account signed in under ~/.openart) and read the downloaded file."""
    with tempfile.TemporaryDirectory() as out_dir:
        proc = subprocess.run(
            ["openart", "generate", "image", prompt,
             "--model", OPENART_IMAGE_MODEL, "-o", out_dir + "/",
             "--json", "--no-input", "--quiet", "--timeout", f"{OPENART_TIMEOUT}s"],
            capture_output=True, text=True, timeout=OPENART_TIMEOUT + 30,
        )
        if proc.returncode != 0:
            raise RuntimeError(f"openart exit {proc.returncode}: {(proc.stderr or proc.stdout).strip()[:300]}")
        files = sorted(f for f in os.listdir(out_dir) if not f.startswith("."))
        if not files:
            raise RuntimeError("openart finished but downloaded no file")
        ext = files[0].rsplit(".", 1)[-1].lower()
        mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp"}.get(ext, "image/png")
        with open(os.path.join(out_dir, files[0]), "rb") as fh:
            data = fh.read()
    history_id = (json.loads(proc.stdout or "{}").get("history") or {}).get("id")
    logger.info("Image generated via OpenArt %s (history %s)", OPENART_IMAGE_MODEL, history_id)
    return data, mime


def _kie_generate_image(prompt: str) -> tuple[bytes, str] | None:
    """Create a Kie.ai image task, poll until it finishes, and download the result."""
    headers = {"Authorization": f"Bearer {KIE_API_KEY}", "Content-Type": "application/json"}
    resp = requests.post(
        f"{KIE_API_URL}/api/v1/jobs/createTask",
        headers=headers,
        json={
            "model": KIE_IMAGE_MODEL,
            "input": {"prompt": prompt, "output_format": "png", "aspect_ratio": "16:9"},
        },
        timeout=30,
    )
    body = resp.json()
    # Kie returns HTTP 200 even on errors — the real status is in body["code"]
    if body.get("code") != 200:
        raise RuntimeError(f"createTask failed: {body.get('code')} {body.get('msg')}")
    task_id = body["data"]["taskId"]

    deadline, delay = time.time() + KIE_TIMEOUT_SECONDS, 3
    while time.time() < deadline:
        time.sleep(delay)
        delay = min(delay + 2, 10)
        info = requests.get(
            f"{KIE_API_URL}/api/v1/jobs/recordInfo",
            headers=headers, params={"taskId": task_id}, timeout=30,
        ).json()
        data = info.get("data") or {}
        state = data.get("state")
        if state == "success":
            urls = json.loads(data.get("resultJson") or "{}").get("resultUrls") or []
            if not urls:
                raise RuntimeError(f"task {task_id} succeeded without resultUrls")
            # Kie keeps files for only 14 days — download so we can re-host on Spaces
            img = requests.get(urls[0], timeout=60)
            img.raise_for_status()
            mime = img.headers.get("content-type", "image/png").split(";")[0]
            logger.info("Image generated via Kie.ai %s (task %s, %s credits)",
                        KIE_IMAGE_MODEL, task_id, data.get("creditsConsumed"))
            return img.content, mime
        if state == "fail":
            raise RuntimeError(f"task {task_id} failed: {data.get('failCode')} {data.get('failMsg')}")
    raise TimeoutError(f"task {task_id} not finished after {KIE_TIMEOUT_SECONDS}s")


def generate_image(title: str | None, content: str, topic_name: str, subtopic_name: str) -> tuple[bytes, str] | None:
    """
    Generate one cover image for a post. Returns (image_bytes, mime_type) or None.
    Tries OpenArt (when signed in), then Kie.ai (when KIE_API_KEY is set), then each Gemini model in IMAGE_MODELS;
    any failure just means the post goes out without an image.
    """
    prompt = (
        f"A photorealistic editorial news photograph to accompany a social post on a learning platform.\n"
        f"Post title: {title or subtopic_name}\n"
        f"Subject: {subtopic_name} ({topic_name})\n"
        f"What the post is about: {content[:500]}\n\n"
        "Show one concrete, real-world scene that a photojournalist could actually have photographed for "
        "this story — real places, real objects, real people at work (in India when the story is set in India). "
        "Style: professional DSLR photograph, 35mm lens, natural light, true-to-life colours and textures, "
        "realistic proportions, shallow depth of field, documentary / National Geographic quality. "
        "Keep the main subject centred with space around it (the image is cropped to a wide banner in the feed). "
        "NOT an illustration, cartoon, 3D render, infographic, diagram, map or collage. "
        "No text, letters, numbers, signs, logos or watermarks anywhere in the image."
    )
    if _openart_available():
        try:
            return _openart_generate_image(prompt)
        except Exception as exc:
            logger.warning("OpenArt image generation failed: %s", str(exc)[:200])
    if KIE_API_KEY:
        try:
            return _kie_generate_image(prompt)
        except Exception as exc:
            logger.warning("Kie.ai image generation failed: %s", str(exc)[:200])
    for model in IMAGE_MODELS:
        model = model.strip()
        try:
            resp = _client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                    image_config=types.ImageConfig(aspect_ratio="16:9"),
                ),
            )
            image = next((p.inline_data for p in resp.parts or [] if p.inline_data and p.inline_data.data), None)
            if image:
                logger.info("Image generated via %s (%d bytes)", model, len(image.data))
                return image.data, image.mime_type or "image/png"
            logger.warning("Image model %s returned no image.", model)
        except Exception as exc:
            logger.warning("Image generation failed with %s: %s", model, str(exc)[:200])
    return None
