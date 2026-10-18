"""
Daily current-affairs questions from official PIB (Press Information Bureau) releases.

Safety layers — a question is only saved if it passes all of them:
  1. Grounded: written only from the release summary, with the exact supporting sentence
     quoted ("evidence"); rejected if that sentence is not actually in the source text.
  2. Verified: an independent model answers it from the source alone; rejected if it
     disagrees or finds more than one defensible option.
  3. Approved: saved INACTIVE with the source link and date, so it is invisible to games
     until an admin activates it (Admin → Questions → Pending approval).

PIB's own site blocks this server, so releases are read through Google News restricted
to site:pib.gov.in. The feed carries only PIB's official headline (no body text), so
questions are limited to facts stated in the headline — which is why approval matters.
"""
import html
import json
import logging
import re
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import parsedate_to_datetime

import feedparser
from openai import OpenAI

from config import (
    OPENAI_API_KEY, CA_QUESTIONS_PER_DAY, CA_MODEL, CA_TOPIC, CA_SUBTOPIC,
    MAIL_USER, MAIL_PASSWORD, SMTP_HOST, SMTP_PORT, APPROVAL_EMAIL_TO,
)
from question_client import save_question
from rag_store import question_exists, upsert_question
from topic_client import fetch_all_subtopics

logger = logging.getLogger(__name__)
_client = OpenAI(api_key=OPENAI_API_KEY)

PIB_FEED = "https://news.google.com/rss/search?q=site:pib.gov.in+when:1d&hl=en-IN&gl=IN&ceid=IN:en"


def _clean(text: str) -> str:
    text = html.unescape(re.sub(r"<[^>]+>", " ", text or ""))
    return re.sub(r"\s+", " ", text).strip()


def _norm(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


# Headlines without a testable fact
_SKIP_TITLES = ("pib backgrounder", "press release", "photo gallery", "week in review", "daily bulletin")


def fetch_releases() -> list[dict]:
    """Recent PIB releases: [{title, summary, link, date}]. `summary` is the official headline text."""
    feed = feedparser.parse(PIB_FEED)
    releases, seen = [], set()
    for e in feed.entries:
        title = _clean(e.get("title", "")).removesuffix(" - Press Information Bureau").strip()
        # The feed's "summary" is only the headline wrapped in a link — use the headline itself
        summary = title
        if len(title) < 40 or title.lower() in seen or any(k in title.lower() for k in _SKIP_TITLES):
            continue
        seen.add(title.lower())
        try:
            date = parsedate_to_datetime(e.get("published", "")).strftime("%d %b %Y")
        except Exception:
            date = ""
        releases.append({"title": title, "summary": summary, "link": e.get("link", ""), "date": date})
    return releases


def _chat_json(system: str, user: str) -> dict:
    resp = _client.chat.completions.create(
        model=CA_MODEL, temperature=0, response_format={"type": "json_object"},
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
    )
    return json.loads(resp.choices[0].message.content)


def _pick_exam_worthy(releases: list[dict], n: int) -> list[dict]:
    listing = "\n".join(f"{i}. {r['title']}" for i, r in enumerate(releases))
    data = _chat_json(
        "You select current-affairs items for Indian competitive exams (SSC, Banking, State and Central "
        "Government, Police). Prefer: new schemes and missions, appointments, awards, summits and visits, "
        "MoUs and agreements, defence exercises, reports and indices, firsts and records, sports, science and "
        "space. Each item is an official headline: pick only headlines that themselves state a clear, testable "
        "fact (a number, name, place, scheme or first). Skip routine items and vague headlines. "
        'Return ONLY JSON: {"picks": [<item numbers>]}',
        f"Pick up to {n} items:\n{listing}",
    )
    picks = [i for i in data.get("picks", []) if isinstance(i, int) and 0 <= i < len(releases)]
    return [releases[i] for i in dict.fromkeys(picks)][:n]


def _write_question(r: dict) -> dict | None:
    data = _chat_json(
        "You write one multiple-choice current-affairs question for Indian competitive exams, using ONLY facts "
        "stated in the given official PIB headline. Do not add any fact, date or context that is not in the "
        "headline; the wrong options must be plausible but clearly not what the headline says. Ask about the fact "
        "itself (who, what, where, how much) — never mention 'the headline', 'the press note' or 'PIB' in the "
        "question, and never ask what a release or bulletin is about. "
        "Indian English. Return ONLY JSON: "
        '{"text": "<question>", "options": [{"text": ""}, {"text": ""}, {"text": ""}, {"text": ""}], '
        '"correctOption": <0-3>, "difficulty": "<easy|medium|hard>", '
        '"explanation": "<1 sentence>", "evidence": "<the exact words from the headline that prove the answer>"}',
        f"PIB HEADLINE ({r['date']}): {r['title']}",
    )
    opts = data.get("options") or []
    if not (data.get("text") and len(opts) == 4 and data.get("correctOption") in (0, 1, 2, 3)):
        return None
    # Layer 1: the quoted evidence must really be in the source
    evidence = _norm(data.get("evidence", ""))
    source = _norm(r["title"])
    if len(evidence) < 10 or evidence not in source:
        logger.warning("[CA] rejected — evidence not found in source: %s", r["title"][:70])
        return None
    return data


def _verify(r: dict, q: dict) -> bool:
    """Layer 2: answer from the source alone; must match and be the only defensible option."""
    options = "\n".join(f"{i}. {o['text']}" for i, o in enumerate(q["options"]))
    data = _chat_json(
        "You verify exam questions against a source text. Using ONLY the source, say which option is correct "
        "and whether exactly one option is supported. "
        'Return ONLY JSON: {"answer": <0-3 or -1 if none>, "only_one_correct": <true|false>}',
        f"SOURCE (official PIB headline): {r['title']}\n\nQUESTION: {q['text']}\nOPTIONS:\n{options}",
    )
    return data.get("answer") == q["correctOption"] and data.get("only_one_correct") is True


def _notify(count: int) -> None:
    if not (count and APPROVAL_EMAIL_TO and MAIL_USER and MAIL_PASSWORD):
        return
    msg = EmailMessage()
    msg["Subject"] = f"Reminder: {count} current-affairs question{'s' if count != 1 else ''} waiting for approval"
    msg["From"] = f'"Meenzo" <{MAIL_USER}>'
    msg["To"] = APPROVAL_EMAIL_TO
    msg.set_content(
        f"{count} new current-affairs question(s) were generated from today's PIB releases and checked against "
        "the source.\n\nPlease review them in the admin panel under Questions → Pending approval, and Activate the "
        "ones that are correct. Only approved questions are used in the daily current-affairs game.\n"
    )
    try:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ssl.create_default_context(), timeout=30) as smtp:
            smtp.login(MAIL_USER, MAIL_PASSWORD)
            smtp.send_message(msg)
        logger.info("[CA] approval reminder sent to %s", APPROVAL_EMAIL_TO)
    except Exception as exc:
        logger.error("[CA] approval reminder failed: %s", exc)


def run_current_affairs() -> int:
    """Generate today's current-affairs questions (saved pending approval). Returns how many were saved."""
    logger.info("=== Current affairs: started ===")
    target = next((s for s in fetch_all_subtopics()
                   if s["topicName"] == CA_TOPIC and s["name"] == CA_SUBTOPIC), None)
    if not target:
        logger.error("[CA] topic '%s > %s' not found — run the topic seed.", CA_TOPIC, CA_SUBTOPIC)
        return 0

    releases = fetch_releases()
    logger.info("[CA] %d PIB releases with summaries in the last day", len(releases))
    if not releases:
        return 0

    saved = 0
    for r in _pick_exam_worthy(releases, CA_QUESTIONS_PER_DAY * 2):  # extra candidates: some get rejected
        if saved >= CA_QUESTIONS_PER_DAY:
            break
        try:
            q = _write_question(r)
            if not q:
                continue
            if not _verify(r, q):
                logger.warning("[CA] rejected — independent check disagrees: %s", q["text"][:70])
                continue
            if question_exists(q["text"])[0]:
                continue
            q["description"] = f"{q.get('explanation', '').strip()} Source: PIB press release, {r['date']} — {r['link']}".strip()
            doc = save_question({**q, "isActive": False}, target["topicId"], target["_id"])
            if not doc:
                continue
            upsert_question(question_id=doc["_id"], text=q["text"],
                            metadata={"question_id": doc["_id"], "topic": CA_TOPIC, "subtopic": CA_SUBTOPIC,
                                      "difficulty": q.get("difficulty", "medium")})
            saved += 1
            logger.info("[CA] saved (pending approval): %s", q["text"][:90])
        except Exception as exc:
            logger.error("[CA] failed for '%s': %s", r["title"][:60], exc)

    logger.info("=== Current affairs: %d question(s) saved, pending approval ===", saved)
    _notify(saved)
    return saved
