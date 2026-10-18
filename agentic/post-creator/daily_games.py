"""
Daily games: every day, create one public quiz game per category, open GAME_START → GAME_END IST.

Categories:
  • topics listed in GAMES_PER_SUBTOPIC_TOPICS (default: Engineering) → one game per subtopic
  • every other topic (e.g. Non Engineering)                          → one game mixing all its subtopics

Each game gets a fresh AI-written title + description and a fresh cover image, and
GAME_QUESTIONS random questions picked by the quiz-service. Runs in "total timer" mode
(no per-question limit), so players can join any time while the game is open.

Safe to run more than once a day: categories that already have a game for the day are skipped.
"""
import json
import logging
from datetime import date, datetime, time, timedelta, timezone

import requests

from auth_client import auth_headers, reset_token, upload_image
from config import (
    QUIZ_API_URL, QUESTION_API_URL, GAMES_PER_SUBTOPIC_TOPICS,
    GAME_QUESTIONS, GAME_MIN_QUESTIONS, GAME_START_IST, GAME_END_IST,
)
from generator import _client, CHAT_MODEL, generate_image_from_prompt
from topic_client import fetch_all_subtopics

logger = logging.getLogger(__name__)

IST = timezone(timedelta(hours=5, minutes=30))


def _hm(value: str) -> time:
    h, m = value.split(":")
    return time(int(h), int(m))


# ── categories ────────────────────────────────────────────────────────────────

def _categories() -> list[dict]:
    """[{key, label, topic_id, topic_name, subtopic_id|None, subtopic_names}]"""
    subtopics = fetch_all_subtopics()
    by_topic: dict[str, list[dict]] = {}
    for s in subtopics:
        by_topic.setdefault(s["topicId"], []).append(s)

    cats = []
    for topic_id, subs in by_topic.items():
        topic_name = subs[0]["topicName"]
        if topic_name.strip().lower() in GAMES_PER_SUBTOPIC_TOPICS:
            for s in subs:
                cats.append({
                    "key": f"{topic_id}:{s['_id']}", "label": s["name"],
                    "topic_id": topic_id, "topic_name": topic_name,
                    "subtopic_id": s["_id"], "subtopic_names": [s["name"]],
                })
        else:
            cats.append({
                "key": f"{topic_id}:", "label": topic_name,
                "topic_id": topic_id, "topic_name": topic_name,
                "subtopic_id": None, "subtopic_names": [s["name"] for s in subs],
            })
    return cats


def _available_questions(cat: dict) -> list[str]:
    """Unique question texts the quiz-service can draw from for this category."""
    params = {"topic": cat["topic_id"], "limit": 200}
    if cat["subtopic_id"]:
        params["subTopic"] = cat["subtopic_id"]
    resp = requests.get(f"{QUESTION_API_URL}/api/questions", params=params, timeout=20)
    resp.raise_for_status()
    texts, seen = [], set()
    for q in resp.json().get("questions", []):
        key = q.get("text", "").strip().lower()
        if key and key not in seen:
            seen.add(key)
            texts.append(q["text"])
    return texts


def _existing_keys(day: date) -> set[str]:
    """Categories that already have a game opening on `day` (IST)."""
    resp = requests.get(f"{QUIZ_API_URL}/api/quizzes", timeout=20)
    resp.raise_for_status()
    keys = set()
    for q in resp.json().get("quizzes", []):
        if q.get("status") == "cancelled" or not q.get("scheduledAt"):
            continue
        opens = datetime.fromisoformat(q["scheduledAt"].replace("Z", "+00:00")).astimezone(IST)
        if opens.date() == day and q.get("topic"):
            keys.add(f"{q['topic']}:{q.get('subTopic') or ''}")
    return keys


# ── AI content ────────────────────────────────────────────────────────────────

def _title_and_description(cat: dict, day: date, sample_questions: list[str]) -> dict:
    samples = "\n".join(f"- {t}" for t in sample_questions[:6])
    scope = (cat["subtopic_names"][0] if cat["subtopic_id"]
             else f"{cat['topic_name']} (mixed: {', '.join(cat['subtopic_names'])})")
    prompt = f"""You name daily quiz games for Meenzo, a quiz app for Indian students and job-seekers.

Today's game ({day.strftime('%A, %d %B %Y')}):
Category: {scope}
Format: {GAME_QUESTIONS} multiple-choice questions, open from {GAME_START_IST} to {GAME_END_IST} IST, play any time, one attempt, live leaderboard.
A few of today's questions (for flavour, do not quote them):
{samples}

Write:
- "title": a vivid, memorable game name that evokes the actual subject matter (people, places, ideas, machines),
  max 50 characters. Use wordplay, alliteration or a bold image. Never use the words "Non Engineering",
  "Non-Engineering", "Knowledge", "Quiz", "Test" or "Trivia", and no date, emojis or quotes.
  Style examples (do not copy): "Raj to Republic Rumble", "Volts, Watts & Wizards", "Silicon Sprint",
  "Rivers, Ranges & Rulers", "Bridges of Steel".
- "description": 1–2 energetic sentences, max 200 characters, naming what players will be tested on and
  daring them to top the leaderboard before {"midnight" if GAME_END_IST == "23:59" else GAME_END_IST + " IST"}.

Return ONLY JSON: {{"title": "...", "description": "..."}}"""
    resp = _client.chat.completions.create(
        model=CHAT_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.9,
        response_format={"type": "json_object"},
    )
    data = json.loads(resp.choices[0].message.content)
    title = str(data.get("title", "")).strip().strip('"')[:60] or f"{cat['label']} Challenge"
    desc  = str(data.get("description", "")).strip()[:300]
    return {"title": title, "description": desc}


def _game_image(cat: dict, title: str) -> str | None:
    # Name the real subjects — a bucket name like "Non Engineering" gets read as "the arts"
    scope = (cat["subtopic_names"][0] if cat["subtopic_id"]
             else "general knowledge about India and the world: " + ", ".join(cat["subtopic_names"]))
    prompt = (
        f"A striking, photorealistic cover image for a quiz game called \"{title}\" about {scope}.\n"
        "Show one real-world scene or object that instantly says this subject, with dramatic lighting, "
        "rich colour and a sense of challenge and energy — professional editorial photography, shallow depth of field. "
        "Keep the main subject centred with space around it (the image is cropped to a wide banner). "
        "NOT an illustration, cartoon, 3D render, infographic or collage. "
        "No text, letters, numbers, signs, logos or watermarks anywhere in the image."
    )
    image = generate_image_from_prompt(prompt)
    return upload_image(*image) if image else None


# ── quiz-service ──────────────────────────────────────────────────────────────

def _quiz_request(method: str, path: str, payload: dict) -> dict:
    for attempt in range(2):
        resp = requests.request(method, f"{QUIZ_API_URL}{path}", json=payload, headers=auth_headers(), timeout=30)
        if resp.status_code == 401 and attempt == 0:
            reset_token()  # cached admin token expired — log in again once
            continue
        if not resp.ok:
            raise RuntimeError(f"{method} {path} → {resp.status_code}: {resp.text[:300]}")
        return resp.json()
    raise RuntimeError(f"{method} {path} → unauthorized")


def _window(day: date) -> tuple[datetime, int] | None:
    """(opens_at, duration_minutes) for `day`, or None if too late to run a game that day."""
    start = datetime.combine(day, _hm(GAME_START_IST), IST)
    end   = datetime.combine(day, _hm(GAME_END_IST), IST)
    now   = datetime.now(IST)
    opens = max(start, now + timedelta(minutes=2))
    minutes = int((end - opens).total_seconds() // 60)
    return (opens, minutes) if minutes >= 60 else None


def run_daily_games(day: date | None = None) -> list[dict]:
    """Create the day's games. Default day: today if a game can still run today, else tomorrow."""
    now = datetime.now(IST)
    if day is None:
        day = now.date() if _window(now.date()) else now.date() + timedelta(days=1)
    window = _window(day)
    if not window:
        logger.warning("Daily games: too late to open games for %s. Skipping.", day)
        return []
    opens_at, duration = window
    logger.info("=== Daily games for %s: open %s for %d min (until %s IST) ===",
                day, opens_at.strftime("%H:%M"), duration, GAME_END_IST)

    try:
        cats = _categories()
        existing = _existing_keys(day)
    except Exception as exc:
        logger.error("Daily games: could not load categories/quizzes: %s", exc)
        return []

    created = []
    for cat in cats:
        label = cat["label"]
        if cat["key"] in existing:
            logger.info("[%s] game already exists for %s — skipping.", label, day)
            continue
        try:
            questions = _available_questions(cat)
            count = min(GAME_QUESTIONS, len(questions))
            if count < GAME_MIN_QUESTIONS:
                logger.warning("[%s] only %d questions available (need %d) — no game today.",
                               label, len(questions), GAME_MIN_QUESTIONS)
                continue
            if count < GAME_QUESTIONS:
                logger.info("[%s] only %d questions available — running a %d-question game.",
                            label, len(questions), count)

            text  = _title_and_description(cat, day, questions)
            image = _game_image(cat, text["title"])

            quiz = _quiz_request("POST", "/api/quizzes", {
                "title":                text["title"],
                "description":          text["description"],
                "questionCount":        count,
                "selectionMode":        "random",
                "topic":                cat["topic_id"],
                **({"subTopic": cat["subtopic_id"]} if cat["subtopic_id"] else {}),
                "timezone":             "Asia/Kolkata",
                "scheduledAt":          opens_at.astimezone(timezone.utc).isoformat(),
                "durationMinutes":      duration,
                "timeLimitPerQuestion": None,  # total-timer mode: join any time while open
                "scheduleType":         "once",
                "participation":        "public",
            })["quiz"]
            if image:
                _quiz_request("PATCH", f"/api/quizzes/{quiz['_id']}", {"image": image})

            logger.info("✅ [%s] '%s' — %d questions, opens %s IST (quiz %s)%s",
                        label, text["title"], count, opens_at.strftime("%d %b %H:%M"), quiz["_id"],
                        "" if image else " — no image")
            created.append({"category": label, "quiz_id": quiz["_id"], "title": text["title"],
                            "description": text["description"], "questions": count, "image": image})
        except Exception as exc:
            logger.error("[%s] daily game failed: %s", label, exc)

    logger.info("=== Daily games done: %d created ===", len(created))
    return created
