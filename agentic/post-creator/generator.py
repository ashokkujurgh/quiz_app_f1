"""
AI content generation — textbook-style ("bookish") posts only, no current affairs,
so every claim can be checked against a standard textbook or encyclopedia:
  basic     (70%) — clear educational explainer, well-established examples
  fun       (15%) — witty, light-hearted, meme-energy but still informative
  question  (15%) — thought-provoking question rooted in the subject itself

Each post also gets a reading level, independent of mode:
  foundation (70%) — high-school / job-seeker level, no jargon left unexplained
  advanced   (30%) — assumes the reader already knows the subject's fundamentals
"""
import html
import logging
import json
import random
import re
import os
import shutil
import subprocess
import tempfile
import time
import requests
import base64
from openai import OpenAI, RateLimitError
from config import (
    OPENAI_API_KEY, CHAT_MODEL, CHAT_FALLBACK_MODELS, FACT_CHECK_MODEL, HINDI_POST_MODEL, EMBED_MODEL, EMBED_DIM, IMAGE_MODELS,
    KIE_API_KEY, KIE_API_URL, KIE_IMAGE_MODEL, KIE_TIMEOUT_SECONDS,
    OPENART_ENABLED, OPENART_IMAGE_MODEL, OPENART_TIMEOUT,
)
from trending import INDIA_BIASED_SUBTOPICS, INDIA_50_SUBTOPICS, TRENDING_BIASED_SUBTOPICS

logger = logging.getLogger(__name__)

_client = OpenAI(api_key=OPENAI_API_KEY)

# ── post mode weights ─────────────────────────────────────────────────────────
# No "trending" (news-hooked) mode: current affairs are hard to verify, so posts
# stick to established textbook knowledge.
POST_MODES   = ["basic"]   # bookish explainer only — "fun"/"question" styles read like features, not study material
MODE_WEIGHTS = [1.0]


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
# india (80%) — India-centred story and examples
# world (20%) — world history/science and well-documented international examples
# (only for General Studies and Engineering — see _EXAM_AUDIENCE)
REGIONS        = ["india", "world"]
REGION_WEIGHTS = [0.80,    0.20]


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
- NEVER open with a made-up hypothetical scene ("Imagine you are...", "Picture yourself..."), a story, or a news-style hook about a person, year or event. Open the way a textbook chapter does: say plainly what the concept is and why it matters.
- Every fact must be correct textbook knowledge. Avoid vague filler and generic hype phrases.
- Don't use rhetorical filler questions as transitions (e.g. "But what does this mean?"). Only pose a question when it is the actual point being made.
- Title must be a plain, descriptive textbook-style chapter title that names the concept (e.g. "Fundamental Rights in the Indian Constitution", "Simple Interest and Compound Interest", "Ohm's Law and Electrical Resistance"). No story, no year or person unless the topic itself is about them, no clickbait, no question titles.
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
- Length: 650-1000 words. Multiple flowing paragraphs. No lists or headers.
""" + _QUALITY_BAR

# Appended to every mode's system prompt — how the writing should *sound*
_VOICE_RULES = """
VOICE — NATURAL INDIAN ENGLISH, WRITTEN LIKE A GOOD TEACHER (very important):
- Write the way an experienced Indian teacher explains things to students: warm, clear, a little
  conversational, confident. Plain words over fancy ones.
- Indian English conventions: British spelling (colour, centre, analyse, organisation, programme,
  behaviour, favourite, metre, labour); lakh and crore for Indian figures (e.g. "about 2 lakh students");
  ₹ for rupees; metric units; dates like "26 January 1950".
- Vary the rhythm the way people really write: mix short sentences with longer ones, vary paragraph
  length (a one- or two-line paragraph now and then is fine), and use contractions (it's, don't, that's).
- Speak to the reader as "you" where it helps. Do NOT invent personal stories, experiences, students,
  quotes or anecdotes ("I remember…", "a student once asked me…") — no fake first-person claims.
- Avoid words and phrases that make writing sound machine-made: "delve", "tapestry", "testament to",
  "in today's fast-paced world", "it's important to note", "it is worth noting", "navigate the
  complexities", "plays a pivotal/crucial/vital role", "embark on", "unlock the", "ever-evolving",
  "game-changer", "in the realm of", "a beacon of", "stands as a", "nestled", "bustling", "intricate",
  "multifaceted", "moreover", "furthermore", "additionally", and "not only… but also" used repeatedly.
- Paragraphs must clearly differ in length: include at least two short paragraphs (one to three
  sentences) among the longer ones. Never make every paragraph the same size.
- Avoid the "X is not just A; it's B" / "not only… but also" construction (at most once per post).
- No list-of-three padding in every sentence, no dramatic one-word sentences ("Revolutionary."),
  and no preachy moral at the end (the "Key points to remember" list is the only summary).
- When unsure of an exact count, date or figure, describe it in words rather than state a number.
- Light Indian context is welcome where it fits naturally (everyday Indian examples) — never forced,
  never stereotyped.
- Write only about the subject itself. NEVER mention exams, exam relevance, aspirants, students preparing,
  or exam names (SSC, banking, UPSC, GATE, PSU…) in the post — no "this is important for exams" or
  "frequently tested" sentences, no addressing the reader as an exam-taker.
"""

# Appended to every mode's system prompt
_TEXTBOOK_RULES = """
SOURCE RULES — TEXTBOOK KNOWLEDGE ONLY (most important rule):
- Use only well-established, verifiable knowledge of the kind found in standard textbooks (e.g. NCERT,
  standard university textbooks) and major encyclopedias: definitions, laws, principles, mechanisms,
  classic experiments, and historical events with widely documented dates.
- NO current affairs: no news, recent events, recent policies, live statistics, rankings, prices,
  or anything from the last two years. No predictions, rumours, or contested/controversial claims.
- Only state exact numbers, dates and names that are widely documented textbook facts. If you are not
  certain of an exact figure, describe it qualitatively instead of guessing.
- Never invent statistics, quotes, studies, people or sources.
"""

# Hindi posts: replaces _VOICE_RULES (which is about Indian *English*) and renames the closing list
HINDI_KEY_POINTS = "याद रखने योग्य मुख्य बिंदु"
_VOICE_RULES_HI = f"""
LANGUAGE — HINDI (very important):
- Write the ENTIRE post — title, headings, body, key points and SEO fields — in clear, standard Hindi in
  Devanagari, the way a good NCERT Hindi-medium textbook explains things: simple, correct, natural.
- Use the standard Hindi terms students meet in Hindi-medium books and exam papers (e.g. "अनुच्छेद" for a
  constitutional Article, "मौलिक अधिकार", "प्रकाश संश्लेषण"). You may add the English term in brackets once,
  the first time a technical word appears, e.g. "प्रकाश संश्लेषण (Photosynthesis)". Otherwise no English.
- Use lakh and crore, ₹, metric units and dates like "26 जनवरी 1950".
- Vary sentence and paragraph length naturally; include at least two short paragraphs.
- Do NOT invent personal stories, quotes or anecdotes. No machine-sounding filler.
- Write only about the subject itself. NEVER mention exams, exam relevance or aspirants
  ("परीक्षा", "प्रतियोगी", "अभ्यर्थी", SSC, UPSC …) anywhere in the post.
- The closing heading must be exactly <h2>{HINDI_KEY_POINTS}</h2> (instead of "Key points to remember").
"""

_SYSTEM_BASIC = """\
You write study material for Meenzo, a learning app for Indian students and exam aspirants.
Your job: write a BOOKISH post — a short textbook chapter that explains one concept clearly and completely,
the way a good NCERT-style textbook or a well-written study guide would. It is NOT a news story or feature.

Voice: a clear, patient teacher. Plain words, correct facts, no drama.
FORMAT: write the "content" field as clean HTML using ONLY these tags: <p>, <h2>, <h3>, <strong>, <em>,
<ul>, <ol>, <li>, <blockquote>, <pre><code> (code only), <table>/<tr>/<th>/<td> (only for a genuine comparison).
No <h1>, no inline styles, no classes, no images, no markdown.
Structure (follow this order):
1. Opening <p>: say plainly what the concept is (a simple definition in your own words) and why it matters for the student.
2. Explanation: build the concept step by step, from the basics upward, under 3-5 short <h2> section headings
   (e.g. "Types of …", "How it works", "Examples", "Common mistakes"). Use <strong> for key terms the first time
   they appear. Go deep: explain the why behind each point, not only the what.
3. Examples: at least three clear, standard textbook examples (Indian examples where they fit), each explained
   in a few sentences. Where it helps, add a short worked example or a common misconception and its correction.
4. End with <h2>Key points to remember</h2> followed by a <ul> of 4-6 short <li> points.
   The post ENDS with that list — write nothing after it.
Rules:
- No story openings, no news hooks, no "In 1991, X decided..." style beginnings, no current affairs.
- Never say "Did you know" or "In conclusion".
- Length: 650-900 words in total (headings and key points included). Never fewer than 600 or more than 1000.
  Reach the length with more explanation and examples — never by repeating a point.
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
- Length: 650-1000 words. Punchy paragraphs but substantial depth. No bullet points.
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
- Active voice. Substantial paragraphs. 650-1000 words. No bullet points.
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


# Who each topic is written for. Exam names go into the SEO metadata, not as tags in the post.
_EXAM_AUDIENCE = {
    "engineering": {
        "readers": "engineering students preparing for GATE and PSU recruitment (NTPC, BHEL, ONGC, IOCL and others "
                   "that hire through GATE), and state AE/JE exams",
        "exams": ["GATE", "PSU recruitment", "AE JE exam"],
        "region": True,
    },
    "general studies": {
        "readers": "aspirants preparing for SSC (CGL, CHSL, MTS), State SSC, banking (IBPS, SBI PO and Clerk), police "
                   "constable and SI, and State and Central Government exams",
        "exams": ["SSC CGL", "Banking exams", "Police exam", "State Government exams", "Central Government jobs"],
        "region": True,
    },
    "aptitude & reasoning": {
        "readers": "aspirants preparing for SSC, banking, police and PSU exams and private-company recruitment tests",
        "exams": ["SSC", "Bank PO", "Police exam", "PSU exam", "Placement aptitude test"],
        "region": False,
    },
}


def _audience(topic_name: str) -> dict | None:
    return _EXAM_AUDIENCE.get(topic_name.strip().lower())


def _audience_clause(topic_name: str, subtopic_name: str) -> str:
    aud = _audience(topic_name)
    if not aud:
        return ""
    clause = (
        f"\nREADERS: {aud['readers']}. Teach what such a reader actually needs to understand and remember. "
        "This only guides depth and choice of facts — do NOT mention exams, aspirants or exam relevance anywhere in the post."
    )
    if topic_name.strip().lower() == "aptitude & reasoning":
        clause += (
            "\nInclude one or two fully worked examples with clean numbers, showing each step, plus a quick shortcut "
            "method. Double-check every calculation."
        )
    return clause


def _seo_clause(topic_name: str) -> str:
    aud = _audience(topic_name)
    if not aud:
        return ""
    return (
        "\nSEO METADATA (not shown in the post): include 2-3 of these exam names in seo.keywords and mention the most "
        f"relevant one naturally in seo.metaDescription: {', '.join(aud['exams'])}."
    )


def _region_clause(subtopic_name: str, region: str) -> str:
    if region == "world":
        return (
            "\nREGION FOCUS — WORLD: Draw the examples from world history, science and "
            "well-documented international examples outside India (scientists, inventions, landmark events, "
            "places and institutions found in standard textbooks). No current affairs. "
            "Do not make India the subject; mention India at most once, and only if genuinely essential."
        )
    if _is_india_50(subtopic_name) or not _is_india_biased(subtopic_name):
        return (
            "\nREGION FOCUS — INDIA: Build this post around India — Indian history, geography, the "
            "Constitution, science and well-documented Indian examples as taught in NCERT and standard "
            "textbooks. No current affairs. A brief global comparison is fine."
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
    recent_titles: list[str] | None = None,
    language: str = "en",
) -> dict | None:
    """
    Generate a post with the given mode, reading level and region ("india" / "world").
    language "hi" writes the whole post in Hindi (with Hindi rules and checks) and adds an English URL slug.
    Returns { title, content, seo, mode, level } or None on failure.
    """
    system_map = {
        "trending": _SYSTEM_TRENDING,
        "basic":    _SYSTEM_BASIC,
        "fun":      _SYSTEM_FUN,
        "question": _SYSTEM_QUESTION,
    }
    hindi = language == "hi"
    # Hindi posts: gpt-4.1 invented places and facts when writing Hindi; HINDI_POST_MODEL also fact-checks them
    gen_model = HINDI_POST_MODEL if hindi else None
    system_prompt = (system_map.get(mode, _SYSTEM_BASIC) + _level_clause(level)
                     + (_VOICE_RULES_HI if hindi else _VOICE_RULES) + _TEXTBOOK_RULES)

    aud          = _audience(topic_name)
    # Region focus only where it makes sense (not for Aptitude)
    india_note   = (_region_clause(subtopic_name, region) if (aud is None or aud["region"]) else "") \
                   + _audience_clause(topic_name, subtopic_name)
    seo_note     = _seo_clause(topic_name)
    avoid_note   = ("Choose a different concept from these recent posts: " + "; ".join(recent_titles[:12]) + "."
                    if recent_titles else "")
    context_note = _context_clause(web_context, trending_news, mode)

    trend_note = ""
    if trending_hint and mode == "trending":
        trend_note = f"\nTrending angle to incorporate: {trending_hint}"

    mode_title_hints = {
        "trending": "title built around the SPECIFIC news event/name/number from the hook — not a generic template",
        "basic":    "plain textbook-style chapter title naming the concept, e.g. 'Fundamental Rights in the Indian Constitution' — no story, year, person or question",
        "fun":      "witty title tied to the SPECIFIC angle of this post — not a generic 'X is Like Y' template",
        "question": "the actual specific question this post explores, in the reader's words — not a generic template",
    }
    title_hint = mode_title_hints.get(mode, "engaging title")

    user_prompt = f"""Topic: {topic_name}
Subtopic: {subtopic_name}
Post mode: {mode.upper()}{india_note}{trend_note}{context_note}

Write a {mode} post on ONE specific, chapter-sized concept from the standard "{subtopic_name}" syllabus
(topic "{topic_name}") — for example one law, process, article, scheme, period, method or technique — NOT an
overview of the whole subject. {avoid_note}{seo_note}
The post must focus on teaching this subject deeply — not on current events or news.
Title should be a {title_hint}.
IMPORTANT: The content must be 650-900 words in total — never fewer than 600 or more than 1000. Add depth, don't pad.

{"WRITE THE WHOLE POST IN HINDI (Devanagari) — title, headings, content and SEO fields." if hindi else ""}
Return ONLY valid JSON — no markdown, no code fences:

{{
  "title": "<{title_hint}, max 100 chars>",{chr(10) + '  "slug": "<4-8 English words for the URL, lowercase, hyphen-separated>",' if hindi else ""}
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
        data = _generate_once(messages, gen_model)
        for attempt in range(2):
            violations = _quality_violations(html_to_text(data["content"]), language)
            if not violations:
                break
            logger.warning("[%s] Quality check failed (%s) — requesting rewrite (%d/2).", mode, "; ".join(violations), attempt + 1)
            messages.append({"role": "assistant", "content": json.dumps(data, ensure_ascii=False)})
            messages.append({"role": "user", "content": (
                "Your draft breaks these rules: " + "; ".join(violations) + ". "
                "Rewrite the ENTIRE post: use your single strongest analogy ONLY in the opening paragraph "
                "(and optionally a one-line callback at the very end) — every paragraph in between must have "
                "ZERO comparison language and contain only facts, examples, and explanation. If it opened with a "
                "made-up hypothetical scene, replace that opener with a real, specific, verifiable fact, event, "
                "or statistic instead. Remove any banned phrase entirely and reword naturally, the way a good "
                "Indian teacher would say it. Fix any US spellings to British/Indian English. Make the title "
                "reference a specific fact/name from the content, not a generic template. Keep the content "
                f"between {MIN_POST_WORDS} and {MAX_POST_WORDS} words (add explanation and examples if it is shorter, "
                "trim the least important sentences if it is longer), and keep the "
                "same JSON format." + (f" Keep the whole post in Hindi, ending with <h2>{HINDI_KEY_POINTS}</h2>." if hindi else "")
            )})
            data = _generate_once(messages, gen_model)
        else:
            remaining = _quality_violations(html_to_text(data["content"]), language)
            if _hard_violations(remaining):
                logger.error("[%s] Still breaks a hard rule after 2 rewrites (%s) — not publishing.",
                             mode, "; ".join(_hard_violations(remaining)))
                return None
            if remaining:
                logger.warning("[%s] Still has issues after 2 rewrites (%s) — using it anyway.", mode, "; ".join(remaining))

        if not _is_html(data["content"]):          # legacy plain-text output only
            data["content"] = _tidy_bookish(data["content"])
        if hindi and (data.get("slug") or "").strip():
            data["slug"] = re.sub(r"[^a-z0-9-]+", "-", data["slug"].strip().lower()).strip("-")[:80] or None

        # Fact-check pass: a strict, independent review of specific claims; fix anything wrong
        issues = _fact_check(data.get("title") or "", html_to_text(data["content"]), gen_model)
        if issues:
            logger.warning("[%s] Fact-check flagged %d claim(s): %s — rewriting.", mode, len(issues),
                           " | ".join(f"{i.get('claim', '')[:60]} → {i.get('correction', '')[:60]}" for i in issues))
            messages.append({"role": "assistant", "content": json.dumps(data, ensure_ascii=False)})
            messages.append({"role": "user", "content": (
                "A fact-checker found these errors. Fix every one, using the correction given (or remove the claim "
                "if you are not certain), and change nothing else. Keep the same JSON format:\n" +
                "\n".join(f"- WRONG: {i.get('claim')}  CORRECT: {i.get('correction')}" for i in issues)
            )})
            data = _generate_once(messages, gen_model)
            if not _is_html(data["content"]):
                data["content"] = _tidy_bookish(data["content"])
            still = _fact_check(data.get("title") or "", html_to_text(data["content"]), gen_model)
            if still:
                logger.error("[%s] Fact-check still flags %d claim(s) after the fix — not publishing.", mode, len(still))
                return None
            hard = _hard_violations(_quality_violations(html_to_text(data["content"]), language))
            if hard:  # the fact-fix rewrite must not reintroduce exam talk or leave the length range
                logger.error("[%s] Fact-fixed draft breaks a hard rule (%s) — not publishing.", mode, "; ".join(hard))
                return None

        word_count = len(html_to_text(data["content"]).split())
        logger.info("[%s/%s] Generated %d words for content.", mode, level, word_count)
        data["mode"] = mode
        data["level"] = level
        data["language"] = language
        return data
    except Exception as exc:
        logger.error("[%s] Content generation failed: %s", mode, exc)
        return None


_ANALOGY_MARKERS  = ["like a ", "like the ", "similar to", "akin to", "just like", "think of it as"]
_BANNED_PHRASES   = ["in conclusion", "in summary", "to conclude", "in today's world", "did you know",
                     # phrases that make text read as machine-written
                     "delve", "tapestry", "testament to", "fast-paced world", "it's important to note",
                     "it is important to note", "it is worth noting", "it's worth noting", "navigate the complexities",
                     "plays a pivotal role", "plays a crucial role", "plays a vital role", "embark on", "unlock the",
                     "ever-evolving", "game-changer", "in the realm of", "a beacon of", "multifaceted", "moreover,",
                     "furthermore,"]
# Indian English uses British spelling; flag the common US forms (whole words only)
_US_SPELLINGS     = {"color": "colour", "colors": "colours", "favorite": "favourite", "behavior": "behaviour",
                     "analyze": "analyse", "analyzed": "analysed", "organization": "organisation",
                     "organizations": "organisations", "center": "centre", "centers": "centres",
                     "labor": "labour", "meter": "metre", "meters": "metres", "neighbor": "neighbour"}
# Exam-relevance filler ("important for SSC and banking exams…") — the post must stay on the subject
_EXAM_TALK_RE     = re.compile(r"\b(exams?|examinations?|aspirants?|competitive|frequently (?:tested|asked)|"
                               r"students preparing|recruitment tests?)\b", re.I)
_EXAM_NAMES_RE    = re.compile(r"\b(SSC|UPSC|IBPS|GATE|PSUs?|CGL|Bank PO|RRB)\b")  # case-sensitive: skips "logic gate"
MIN_POST_WORDS    = 600   # hard limits on post length (plain-text words): short posts read as thin content
MAX_POST_WORDS    = 1000
_HYPOTHETICAL_OPENERS = ["imagine you", "imagine standing", "imagine a world", "imagine a", "picture yourself", "picture this"]


def _hard_violations(violations: list[str]) -> list[str]:
    """Rules a post must never break when published: no exam talk, and the word range."""
    return [v for v in violations if v.startswith("mentions exams") or v.startswith("is ") and " words — " in v]


# Hindi exam talk ("परीक्षा में पूछा जाता है", "अभ्यर्थी" …) — same hard rule as the English list
_EXAM_TALK_HI_RE  = re.compile(r"(परीक्षा|परीक्षाओं|प्रतियोगी|अभ्यर्थी|परीक्षार्थी)")


def _quality_violations(content: str, language: str = "en") -> list[str]:
    text = content.lower()
    hindi = language == "hi"
    violations = []
    opener = text[:200]
    if any(phrase in opener for phrase in _HYPOTHETICAL_OPENERS):
        violations.append("opens with a made-up hypothetical scene instead of a real fact/event")
    for phrase in _BANNED_PHRASES:
        if phrase in text:
            violations.append(f'contains banned phrase "{phrase}"')
    exam_talk = sorted({m.group(0) for m in _EXAM_TALK_RE.finditer(content)}
                       | {m.group(0) for m in _EXAM_NAMES_RE.finditer(content)}
                       | ({m.group(0) for m in _EXAM_TALK_HI_RE.finditer(content)} if hindi else set()))
    if exam_talk:
        violations.append("mentions exams/aspirants (" + ", ".join(exam_talk) + ") — remove every sentence about exam "
                          "relevance or exam names; keep only subject content")
    words = len(content.split())
    if words > MAX_POST_WORDS:
        violations.append(f"is {words} words — cut it to at most {MAX_POST_WORDS} words, keeping every section")
    elif words < MIN_POST_WORDS:
        violations.append(f"is {words} words — expand it to at least {MIN_POST_WORDS} words with more explanation "
                          "and examples, without repeating any point")
    if hindi:
        if HINDI_KEY_POINTS not in content:
            violations.append(f'missing the "{HINDI_KEY_POINTS}" list at the end (4-6 short points)')
        deva = len(re.findall(r"[\u0900-\u097F]", content))
        latin = len(re.findall(r"[A-Za-z]", content))
        if deva < 4 * max(latin, 1):
            violations.append("too much English — write the post in Hindi (English terms only once, in brackets)")
    elif "key points to remember" not in text:
        violations.append('missing the "Key points to remember" list at the end (4-6 lines starting with "- ")')
    paras = [len(p.split()) for p in content.split("\n") if p.strip()]
    if len(paras) >= 4 and sum(1 for n in paras if n <= 50) < 2:
        violations.append("every paragraph is a similar, long block — add at least two short paragraphs (1–3 sentences) so the rhythm varies")
    not_just = text.count("not just") + text.count("not only")
    if not_just > 1:
        violations.append(f'uses the "not just… / not only…" construction {not_just} times (max once)')
    us = sorted({w for w in re.findall(r"[a-z]+", text) if w in _US_SPELLINGS}) if not hindi else []
    if us:
        violations.append("uses US spelling (" + ", ".join(f"{w}→{_US_SPELLINGS[w]}" for w in us) + ") — use Indian/British English")
    analogy_count = sum(text.count(marker) for marker in _ANALOGY_MARKERS)
    if analogy_count > 2:
        violations.append(f"stacks {analogy_count} separate analogies instead of using one central analogy")
    return violations


def _is_html(content: str) -> bool:
    return bool(re.search(r"</?(p|h[1-6]|ul|ol|li|strong|pre|code)\b", content or "", re.I))


def html_to_text(content: str) -> str:
    """Plain text of a post (HTML or legacy text) — for checks, embeddings, filters and previews."""
    if not re.search(r"</?(p|h[1-6]|ul|ol|li|strong|em|pre|code|blockquote|table|br)\b", content or "", re.I):
        return (content or "").strip()
    text = re.sub(r"</(p|h[1-6]|li|blockquote|pre|tr)>", "\\g<0>\n", content, flags=re.I)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"<li[^>]*>", "• ", text, flags=re.I)
    text = html.unescape(re.sub(r"<[^>]+>", "", text))
    return re.sub(r"\n{3,}", "\n\n", re.sub(r"[ \t]+\n", "\n", text)).strip()


_BULLET_RE = re.compile(r"^\s*(?:[-*•◦▪○●]|\d{1,2}[.)])\s+")


def _tidy_bookish(content: str) -> str:
    """Normalise list bullets to "• " and end the post at the Key points list (drop any trailing line)."""
    lines = content.replace("\r", "").split("\n")
    lines = [_BULLET_RE.sub("• ", ln) if _BULLET_RE.match(ln) else ln for ln in lines]
    idx = next((i for i, ln in enumerate(lines) if "key points to remember" in ln.lower()), None)
    if idx is not None:
        end = idx
        for i in range(idx + 1, len(lines)):
            if lines[i].startswith("• "):
                end = i
            elif lines[i].strip() and end > idx:
                break                      # first non-list text after the list — cut here
        if end > idx:                      # only trim when the list actually has items
            lines = lines[: end + 1]
    return "\n".join(lines).strip()


def _fact_check(title: str, content: str, model: str | None = None) -> list[dict]:
    """
    Independent check of specific factual claims (numbers, dates, names, counts) against standard
    textbook knowledge. Returns [{claim, correction}] for errors; [] if clean or if the check can't run.
    """
    model = model or FACT_CHECK_MODEL
    try:
        resp = _client.chat.completions.create(
            model=model,
            response_format={"type": "json_object"},
            **_sampling(model, 0, 2048),
            messages=[
                {"role": "system", "content": (
                    "You are a strict fact-checker for Indian competitive-exam study material. Check every specific "
                    "claim — numbers, dates, counts, names, firsts, superlatives — against standard references "
                    "(NCERT, M. Laxmikanth, standard engineering textbooks, official sources). "
                    "Flag only claims that are wrong or seriously misleading; do not flag style or opinions. "
                    'Return ONLY JSON: {"issues": [{"claim": "<exact wrong text>", "correction": "<correct fact>"}]} '
                    '— an empty list if everything is correct.'
                )},
                {"role": "user", "content": f"TITLE: {title}\n\n{content}"},
            ],
        )
        issues = json.loads(resp.choices[0].message.content).get("issues") or []
        return [i for i in issues if isinstance(i, dict) and i.get("claim")]
    except Exception as exc:
        logger.warning("Fact-check could not run: %s", exc)
        return []


def _sampling(model: str, temperature: float, max_tokens: int) -> dict:
    """gpt-5 / o-series models take only the default temperature and use max_completion_tokens."""
    if model.startswith(("gpt-5", "o")):
        return {"max_completion_tokens": max_tokens * 4}   # room for reasoning tokens too
    return {"temperature": temperature, "max_tokens": max_tokens}


def _generate_once(messages: list[dict], model: str | None = None) -> dict:
    first = model or CHAT_MODEL
    models = [first] + [m for m in CHAT_FALLBACK_MODELS if m != first]
    for i, model in enumerate(models):
        try:
            resp = _client.chat.completions.create(
                model=model,
                messages=messages,
                response_format={"type": "json_object"},
                **_sampling(model, 0.85, 4096),
            )
            break
        except RateLimitError:
            # 429 — this model is rate-limited / out of quota, try the next one
            if i == len(models) - 1:
                raise
            logger.warning("Model %s rate-limited — falling back to %s", model, models[i + 1])
    raw = resp.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    # Parse the first JSON object only — the model sometimes appends extra text after it.
    # Also tolerate a stray "\u" that isn't a valid \uXXXX escape (seen in rewrites).
    raw = re.sub(r"\\u(?![0-9a-fA-F]{4})", r"\\\\u", raw.strip())
    data, _ = json.JSONDecoder().raw_decode(raw)
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
    Tries OpenArt (when signed in), then Kie.ai (when KIE_API_KEY is set), then each OpenAI image model in IMAGE_MODELS;
    any failure just means the post goes out without an image.
    """
    prompt = (
        f"A photorealistic educational documentary photograph to accompany a social post on a learning platform.\n"
        f"Post title: {title or subtopic_name}\n"
        f"Subject: {subtopic_name} ({topic_name})\n"
        f"What the post is about: {html_to_text(content)[:500]}\n\n"
        "Show one concrete, real-world scene that a photojournalist could actually have photographed for "
        "this story — real places, real objects, real people at work (in India when the story is set in India). "
        "Style: professional DSLR photograph, 35mm lens, natural light, true-to-life colours and textures, "
        "realistic proportions, shallow depth of field, documentary / National Geographic quality. "
        "Keep the main subject centred with space around it (the image is cropped to a wide banner in the feed). "
        "NOT an illustration, cartoon, 3D render, infographic, diagram, map or collage. "
        "No text, letters, numbers, signs, logos or watermarks anywhere in the image."
    )
    return generate_image_from_prompt(prompt)


def generate_image_from_prompt(prompt: str) -> tuple[bytes, str] | None:
    """Run an image prompt through the provider chain: OpenArt → Kie.ai → OpenAI. None if all fail."""
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
        try:
            resp = _client.images.generate(model=model, prompt=prompt, size="1536x1024", n=1)
            item = resp.data[0] if resp.data else None
            if item and item.b64_json:
                data = base64.b64decode(item.b64_json)
                logger.info("Image generated via OpenAI %s (%d bytes)", model, len(data))
                return data, "image/png"
            logger.warning("Image model %s returned no image.", model)
        except Exception as exc:
            logger.warning("Image generation failed with %s: %s", model, str(exc)[:200])
    return None
