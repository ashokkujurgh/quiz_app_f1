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
# trending = current-affairs-hooked posts (kept to 30% so the feed doesn't read like a news app)
POST_MODES   = ["trending", "basic", "fun", "question"]
MODE_WEIGHTS = [0.30,       0.50,   0.10, 0.10]


def pick_post_mode() -> str:
    return random.choices(POST_MODES, weights=MODE_WEIGHTS, k=1)[0]


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
- Use analogies, examples, and India-relevant context to make it vivid.
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
- Include multiple real-world examples (India-relevant where possible).
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
- At most one light India-specific cultural touch (exams, traffic, cricket) for the whole post — don't repeat it as a running gag.
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
- Use India-relevant context where natural (but don't force it).
- End with the question directed at the reader — make them WANT to think, discuss, and learn more.
- Never say "In conclusion", never be preachy, never use news as the main frame.
- Active voice. Substantial paragraphs. 500-1000 words. No bullet points.
""" + _QUALITY_BAR


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
        logger.info("[%s] Generated %d words for content.", mode, word_count)
        data["mode"] = mode
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
    resp = _client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.85,
        max_tokens=4096,
    )
    raw = resp.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    data = json.loads(raw)
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
    resp = _client.embeddings.create(model=EMBED_MODEL, input=text[:8000])
    return resp.data[0].embedding


def generate_image(*args, **kwargs) -> None:
    """Image generation is currently disabled."""
    return None
