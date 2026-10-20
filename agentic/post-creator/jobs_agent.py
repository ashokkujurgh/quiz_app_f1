"""
Government-jobs agent: new central and state recruitment notifications → a post + a 2-week quiz series.

Twice a day (JOBS_SCHEDULE_IST):
1. Read fresh job headlines from Google News (several central and state queries).
2. A model keeps only NEW recruitment notifications (not results, admit cards, answer keys, exam
   dates or "expected soon" stories), groups headlines about the same job and extracts the facts.
   Every vacancy count and date must literally appear in one of that job's headlines — anything
   that doesn't is dropped. The feed has headlines only, so that is all the post may state.
3. Skip jobs already posted (Pinecone, same index as posts), then save a post for each new job:
   key details built from those checked facts, a short message, links to the news reports, and a
   reminder to apply only on the official website. It waits for approval like every post.

Every JOB_SERIES_CHECK_MINUTES:
4. For each APPROVED job post, keep a daily practice quiz going for JOB_SERIES_DAYS days: same title and
   description every day, each quiz open 24 hours, each day with freshly generated questions on the next
   subject of the exam type's plan (SSC, Banking, Railway, …). State jobs get English + the state's
   language. Every question must pass an independent answer check.

Dry run (prints what it would post; saves nothing):
    python jobs_agent.py --dry-run
"""
import html
import json
import logging
import re
import urllib.parse
from datetime import date, datetime, timedelta, timezone

import feedparser
import requests

from config import (
    POST_API_URL, QUIZ_API_URL, JOBS_PER_RUN, JOBS_MODEL, JOBS_TRANSLATE_MODEL, JOBS_TOPIC, JOB_SERIES_DAYS,
    JOB_QUIZ_QUESTIONS, JOB_QUIZ_MIN_QUESTIONS, IMAGE_ENABLED,
)
from generator import _client, embed_text, generate_image_from_prompt

logger = logging.getLogger(__name__)

IST = timezone(timedelta(hours=5, minutes=30))

# Google News searches, last 2 days, Indian edition. Broad on purpose: the model filters.
_QUERIES = [
    "recruitment notification vacancies apply online",
    "sarkari naukri notification out",
    "government jobs notification apply last date",
    "SSC OR UPSC OR RRB OR IBPS recruitment notification",
    "PSC recruitment notification posts",
    "police constable recruitment notification",
    "teacher recruitment notification vacancies",
    "army OR navy OR air force recruitment notification",
]
_FEED = "https://news.google.com/rss/search?q={q}+when:2d&hl=en-IN&gl=IN&ceid=IN:en"

# Exam types → series label and 14-day subject plan: (topic, subtopic or None for the whole topic)
_GS, _CA, _APT, _ENG = "General Studies", "Current Affairs", "Aptitude & Reasoning", "Engineering"
GK, POL, HIS, GEO = (_GS, "General Knowledge"), (_GS, "Indian Polity"), (_GS, "Indian History"), (_GS, "Indian Geography")
ECO, SCI, RAJ, GSM = (_GS, "Indian Economy"), (_GS, "General Science"), (_GS, "Rajasthan GK"), (_GS, None)
CA, QA, LR, EN = (_CA, None), (_APT, "Quantitative Aptitude"), (_APT, "Logical Reasoning"), (_APT, "English Language")
CE, EE, ME, EC = (_ENG, "Civil Engineering"), (_ENG, "Electrical Engineering"), (_ENG, "Mechanical Engineering"), (_ENG, "Electronics and Communication")

EXAM_TYPES = {
    "ssc":         ("SSC",             [GK, QA, LR, EN, POL, HIS, GEO, SCI, ECO, QA, LR, EN, CA, GSM]),
    "banking":     ("Banking",         [QA, LR, EN, ECO, CA, QA, LR, EN, GK, ECO, QA, LR, EN, CA]),
    "railway":     ("Railway",         [SCI, QA, LR, GK, HIS, GEO, POL, SCI, QA, LR, CA, ECO, GSM, SCI]),
    "police":      ("Police",          [GK, LR, QA, POL, HIS, GEO, CA, SCI, LR, QA, GK, POL, CA, GSM]),
    "defence":     ("Defence",         [EN, QA, SCI, GK, HIS, GEO, LR, EN, QA, SCI, POL, CA, GSM, EN]),
    "civil":       ("PSC",             [POL, HIS, GEO, ECO, SCI, CA, GK, POL, HIS, GEO, ECO, LR, CA, GSM]),
    "teaching":    ("Teaching",        [GK, LR, EN, QA, SCI, HIS, GEO, POL, EN, LR, QA, CA, GK, GSM]),
    "engineering": ("Engineering",     [CE, EE, ME, EC, QA, LR, CE, EE, ME, EC, QA, LR, GSM, EN]),
    "other":       ("Govt Jobs",       [GK, QA, LR, EN, POL, HIS, GEO, SCI, ECO, CA, QA, LR, EN, GSM]),
}

_SYSTEM_PICK = """You find NEW government job notifications in Indian news headlines for Meenzo, an exam-prep app.

Keep only headlines that announce a NEW recruitment by a central or state government body, public-sector
bank/undertaking, the armed forces or a government university/institute — notification released, applications
open or opening on a stated date. DROP: results, merit lists, cut-offs, admit cards/hall tickets, answer keys,
exam dates or city slips for an existing exam, "expected"/"out soon"/"likely" stories, private-company jobs,
and anything that is not a recruitment.

Group headlines about the same recruitment into one job. Use ONLY facts stated in the headlines — never fill
in vacancies, dates, eligibility or salary from your own knowledge.

exam_type is one of: ssc, banking, railway, police, defence, civil (UPSC/state PSC civil services and other
PSC/SSB general posts), teaching, engineering (AE/JE/engineer/PSU technical posts), other.

Return ONLY JSON:
{"jobs": [{
  "headlines": [<indices of the headlines about this job>],
  "organisation": "<recruiting body, e.g. 'Staff Selection Commission (SSC)'>",
  "post": "<post name(s), e.g. 'Constable' or 'Stenographer'>",
  "level": "central" | "state",
  "state": "<state name if level is state, else null>",
  "exam_type": "<one of the types above>",
  "vacancies": <integer stated in a headline, else null>,
  "last_date": "<last date to apply exactly as written in a headline, else null>",
  "apply_from": "<application start date exactly as written in a headline, else null>",
  "importance": <1-10: how many Indian job-seekers care (large central exams and big vacancy counts score high)>
}]}"""

_SYSTEM_WRITE = """You write short job-alert posts for Meenzo, an exam-prep app for Indian job-seekers.
Write in clear, warm Indian English. Use ONLY the facts given — never add eligibility, salary, age limits,
fees, exam pattern or dates that are not in the facts."""

_USER_WRITE = """Facts (checked against the news headlines):
{facts}

Return ONLY JSON:
{{
  "title": "<post title, max 90 chars, e.g. '<Organisation> <Post> Recruitment {year}: <N> Vacancies' — only facts given>",
  "slug": "<4-9 English words for the URL, lowercase, hyphen-separated>",
  "message": "<2-3 sentences: what was announced and an encouraging nudge to read the official notification, check eligibility and apply in time>",
  "prep_tip": "<1 sentence on which subjects to start revising for a {exam_label} exam, without claiming a specific syllabus>",
  "seo": {{
    "metaTitle": "<max 60 chars>",
    "metaDescription": "<max 155 chars>",
    "keywords": ["<5 search keywords>"],
    "ogTitle": "<max 90 chars>",
    "ogDescription": "<max 200 chars>",
    "ogImage": null,
    "canonical": null
  }}
}}"""


# ── fetch + extract ───────────────────────────────────────────────────────────

def fetch_headlines() -> list[dict]:
    """[{title, source, link, published}] from all queries, de-duplicated by title."""
    seen, out = set(), []
    for q in _QUERIES:
        try:
            feed = feedparser.parse(_FEED.format(q=urllib.parse.quote(q)))
        except Exception as exc:
            logger.warning("[jobs] Feed failed for %r: %s", q, exc)
            continue
        for e in feed.entries:
            title = html.unescape(e.get("title", "")).strip()
            source = (e.get("source") or {}).get("title", "")
            if source and title.endswith(f" - {source}"):
                title = title[: -len(source) - 3].strip()
            key = re.sub(r"\W+", " ", title.lower()).strip()
            # Sources named like a bare web address are usually content farms
            if not title or key in seen or re.search(r"https?://|\.\w{2,3}/?$", source):
                continue
            seen.add(key)
            out.append({"title": title, "source": source, "link": e.get("link"), "published": e.get("published", "")})
    logger.info("[jobs] %d unique headlines from %d searches.", len(out), len(_QUERIES))
    return out


def _chat_json(system: str, user: str, temperature: float = 0, model: str | None = None) -> dict:
    model = model or JOBS_MODEL
    extra = {} if model.startswith(("gpt-5", "o")) else {"temperature": temperature}   # reasoning models: default only
    resp = _client.chat.completions.create(model=model, response_format={"type": "json_object"},
                                           messages=[{"role": "system", "content": system},
                                                     {"role": "user", "content": user}], **extra)
    return json.loads(resp.choices[0].message.content)


_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]


def _in_headlines(value: str, text: str) -> bool:
    """A date/number is grounded only if every number and month in it appears in the headlines."""
    t = text.lower()
    nums = re.findall(r"\d+", value)
    months = [m for m in _MONTHS if m in value.lower()]
    return bool(nums or months) and all(re.search(rf"(?<!\d){n}(?!\d)", t) for n in nums) \
        and all(m in t for m in months)


def _vacancies_grounded(n: int, text: str) -> bool:
    digits = re.sub(r"(?<=\d),(?=\d)", "", text)   # "14,582" → "14582"
    return re.search(rf"(?<!\d){n}(?!\d)", digits) is not None


def extract_jobs(headlines: list[dict]) -> list[dict]:
    """New recruitment notifications with headline-grounded facts, most important first."""
    if not headlines:
        return []
    listing = "\n".join(f"[{i}] {h['title']} ({h['source']})" for i, h in enumerate(headlines))
    data = _chat_json(_SYSTEM_PICK, listing)
    jobs = []
    for j in data.get("jobs") or []:
        try:
            idx = [int(i) for i in j.get("headlines") or [] if 0 <= int(i) < len(headlines)]
        except (TypeError, ValueError):
            continue
        if not idx or not j.get("organisation") or not j.get("post"):
            continue
        heads = [headlines[i] for i in idx]
        text = " | ".join(h["title"] for h in heads)
        job = {
            "organisation": str(j["organisation"]).strip(),
            "post": str(j["post"]).strip(),
            "level": "state" if j.get("level") == "state" else "central",
            "state": (str(j.get("state")).strip() or None) if j.get("level") == "state" and j.get("state") else None,
            "exam_type": j.get("exam_type") if j.get("exam_type") in EXAM_TYPES else "other",
            "importance": int(j.get("importance") or 0),
            "headlines": heads,
        }
        vac = j.get("vacancies")
        job["vacancies"] = int(vac) if isinstance(vac, (int, float)) and vac > 0 and _vacancies_grounded(int(vac), text) else None
        for key in ("last_date", "apply_from"):
            v = j.get(key)
            job[key] = str(v).strip() if isinstance(v, str) and v.strip() and _in_headlines(v, text) else None
        if vac and not job["vacancies"]:
            logger.info("[jobs] Dropped ungrounded vacancy count %s for %s", vac, job["organisation"])
        jobs.append(job)
    jobs.sort(key=lambda x: (x["importance"], x["vacancies"] or 0), reverse=True)
    logger.info("[jobs] %d new notification(s): %s", len(jobs),
                "; ".join(f"{x['organisation']} {x['post']}" for x in jobs[:10]))
    return jobs


# ── post ──────────────────────────────────────────────────────────────────────

def _facts(job: dict) -> list[tuple[str, str]]:
    rows = [("Organisation", job["organisation"]), ("Post", job["post"]),
            ("Level", f"State government — {job['state']}" if job["level"] == "state" and job["state"]
                      else "State government" if job["level"] == "state" else "Central government")]
    if job["vacancies"]:
        rows.append(("Vacancies", f"{job['vacancies']:,}"))
    if job["apply_from"]:
        rows.append(("Applications open", job["apply_from"]))
    if job["last_date"]:
        rows.append(("Last date to apply", job["last_date"]))
    return rows


def write_post(job: dict) -> dict | None:
    """Title, slug, SEO and HTML content for one job. Key details come from the checked facts only."""
    label = EXAM_TYPES[job["exam_type"]][0]
    facts = _facts(job)
    try:
        w = _chat_json(_SYSTEM_WRITE, _USER_WRITE.format(
            facts="\n".join(f"- {k}: {v}" for k, v in facts), year=datetime.now(IST).year, exam_label=label),
            temperature=0.6)
    except Exception as exc:
        logger.error("[jobs] Writing failed for %s: %s", job["organisation"], exc)
        return None
    title = str(w.get("title") or "").strip()[:140]
    allowed = " ".join(v for _, v in facts) + f" {datetime.now(IST).year}"
    # The title may only use numbers that are in the checked facts
    if not title or any(not _vacancies_grounded(int(n), re.sub(r",", "", allowed)) for n in re.findall(r"\d+", title.replace(",", ""))):
        title = f"{job['organisation']} {job['post']} Recruitment {datetime.now(IST).year}"
        if job["vacancies"]:
            title += f": {job['vacancies']:,} Vacancies"
    e = html.escape
    sources = "".join(
        f'<li><a href="{e(h["link"])}" rel="nofollow noopener" target="_blank">{e(h["title"])}</a>'
        f'{" — " + e(h["source"]) if h["source"] else ""}</li>' for h in job["headlines"][:4])
    content = (
        f"<p>{e(str(w.get('message') or '').strip())}</p>"
        "<h2>Key details</h2><ul>" + "".join(f"<li><strong>{e(k)}:</strong> {e(v)}</li>" for k, v in facts) + "</ul>"
        "<h2>How to apply</h2>"
        f"<p>Read the official notification and apply only through the official website of {e(job['organisation'])}. "
        "Check eligibility, age limit, fee and the exact dates there before you apply — never pay anyone who "
        "promises a job.</p>"
        "<h2>Start preparing on Meenzo</h2>"
        f"<p>{e(str(w.get('prep_tip') or '').strip())} {e(_practice_line(title, job['state']))}</p>"
        f"<h2>Source</h2><ul>{sources}</ul>"
        "<p><em>These details are from news reports and may change. The official notification is final.</em></p>"
    )
    year = str(datetime.now(IST).year)
    slug = re.sub(r"(?<!\d)20\d\d(?!\d)", year, str(w.get("slug") or "").strip()) or None   # models guess old years
    return {"title": title, "slug": slug, "seo": w.get("seo"),
            "content": content, "label": label}


def _practice_line(post_title: str, state: str | None) -> str:
    lang = _language_for(state)
    return (f"Practise every day on Meenzo: the “{_series_title({'title': post_title})}” has {JOB_QUIZ_QUESTIONS} new "
            f"questions{' in English and ' + lang if lang else ''} every day for {JOB_SERIES_DAYS} days, "
            "each open for 24 hours.")


def _job_image(job: dict, label: str) -> str | None:
    from auth_client import upload_image
    prompt = (
        f"A photorealistic editorial photograph for a government job alert in India: {label} recruitment "
        f"({job['post']}). Young Indian job aspirants studying together in a library or coaching classroom, focused "
        "and hopeful, natural light, true-to-life colours, documentary style, shallow depth of field. "
        "Keep the main subject centred with space around it (the image is cropped to a wide banner). "
        "No text, letters, numbers, signs, logos, uniforms with insignia or watermarks anywhere."
    )
    image = generate_image_from_prompt(prompt)
    return upload_image(*image) if image else None


# ── daily practice quizzes ────────────────────────────────────────────────────
#
# Each approved job post gets ONE practice quiz identity — the same title and description every day.
# A quiz is open for 24 hours; shortly before it closes, the next one is created with freshly
# generated questions on the next subject in the exam type's plan, for JOB_SERIES_DAYS days.
# State-government jobs get every question in English AND the state's language.

# Official language of each state/UT used for bilingual questions (English-only states are left out)
STATE_LANGUAGES = {
    "andhra pradesh": "Telugu", "telangana": "Telugu", "tamil nadu": "Tamil", "puducherry": "Tamil",
    "karnataka": "Kannada", "kerala": "Malayalam", "maharashtra": "Marathi", "goa": "Konkani",
    "gujarat": "Gujarati", "west bengal": "Bengali", "tripura": "Bengali", "odisha": "Odia",
    "assam": "Assamese", "punjab": "Punjabi", "manipur": "Manipuri",
    "jammu and kashmir": "Urdu", "rajasthan": "Hindi", "uttar pradesh": "Hindi", "bihar": "Hindi",
    "madhya pradesh": "Hindi", "chhattisgarh": "Hindi", "jharkhand": "Hindi", "haryana": "Hindi",
    "himachal pradesh": "Hindi", "uttarakhand": "Hindi", "delhi": "Hindi",
}

_SERIES_LEAD_MINUTES = 90   # create the next day's quiz this long before the current one closes

_SYSTEM_QUESTIONS = """You write multiple-choice practice questions for Indian government job exams on Meenzo.
Rules:
- Exactly 4 options, one clearly correct answer; the other three plausible but definitely wrong.
- Standard textbook knowledge only (NCERT, standard references, well-documented facts). No current affairs,
  nothing from the last two years, no statistics or dates you are not certain of.
- Exam level: like real {exam_label} papers — clear, unambiguous, no trick wording.
- Each question tests a DIFFERENT fact or skill. Quantitative questions need clean numbers; double-check the maths.
- "explanation": one or two sentences on why the answer is right.
{language_rule}"""

_LANG_BILINGUAL = """- LANGUAGE: write every question, option and explanation in English AND {lang}. Give the English in
  "text_en"/"options_en"/"explanation_en" and a faithful, natural {lang} version (in its own script) in
  "text_local"/"options_local"/"explanation_local", in the same order. Keep numbers, formulas and proper nouns
  consistent between the two. Use the standard terms that real {lang}-medium question papers use
  (e.g. the official {lang} word for a constitutional "Article", not a word meaning "essay")."""

_LANG_ENGLISH = """- LANGUAGE: English only (fill only the *_en fields)."""

_USER_QUESTIONS = """Exam: {exam}
Subject today: {subject}
Write {n} questions.
{avoid}
Return ONLY JSON:
{{"questions": [{{
  "text_en": "...", "options_en": ["...", "...", "...", "..."], "correct": <0-3>, "explanation_en": "...",
  "text_local": "...", "options_local": ["...", "...", "...", "..."], "explanation_local": "..."
}}]}}"""


def _language_for(state: str | None) -> str | None:
    return STATE_LANGUAGES.get((state or "").strip().lower())


def _series_title(post: dict) -> str:
    """Fixed quiz title for a job post, e.g. 'BPSC TRE 4.0 Daily Practice Quiz'."""
    base = re.split(r"\s+Recruitment\b", post.get("title") or "", maxsplit=1, flags=re.I)[0].strip(" :-") \
        or post.get("subTopic") or "Govt Job"
    return f"{base[:70]} Daily Practice Quiz"


def _series_description(post: dict, lang: str | None) -> str:
    langs = f" in English and {lang}" if lang else ""
    return (f"{JOB_QUIZ_QUESTIONS} fresh questions{langs} every day for {JOB_SERIES_DAYS} days to help you prepare "
            f"for {post.get('title') or 'this exam'}. Each quiz is open for 24 hours — come back daily for a new set.")[:300]


def _subject_plan(exam_type: str, state: str | None) -> list[tuple[str, str | None, str]]:
    """[(bank topic, bank subtopic or None, subject to write about)] for each day of the series."""
    base = list(EXAM_TYPES[exam_type][1])
    plan = (base * (JOB_SERIES_DAYS // len(base) + 1))[:JOB_SERIES_DAYS]
    out = []
    for topic, sub in plan:
        if (topic, sub) == CA:
            topic, sub = GK            # current affairs are never written from memory
        subject = sub or topic
        if state and (topic, sub) in (GK, GSM):
            subject = f"{state} GK (history, geography, culture, economy and polity of {state})"
            if state.strip().lower() == "rajasthan":
                topic, sub = RAJ
        out.append((topic, sub, subject))
    return out


def _verify_answer(q: dict) -> bool:
    """An independent check must pick the same option from the English text alone."""
    opts = "\n".join(f"{i}. {o}" for i, o in enumerate(q["options_en"]))
    try:
        # "working" comes first so the model actually solves it — answering straight away it got
        # simple sums wrong (picked 19/20 for 3/4 + 2/5)
        r = _chat_json("You are an expert examiner. Solve the multiple-choice question yourself, step by step, "
                       "before choosing. Return ONLY JSON: "
                       '{"working": "<your step-by-step solution>", "answer": <0-3>, "unambiguous": true|false}',
                       f"{q['text_en']}\n\n{opts}")
        return int(r.get("answer", -1)) == q["correct"] and r.get("unambiguous") is True
    except Exception:
        return False


def _review_translations(questions: list[dict], lang: str) -> list[dict]:
    """Second pass by an exam-paper translator: fix terminology and naturalness of the local text."""
    items = [{"i": i, "text_en": q["text_en"], "options_en": q["options_en"],
              "text_local": q.get("text_local"), "options_local": q.get("options_local"),
              "explanation_en": q.get("explanation_en"), "explanation_local": q.get("explanation_local")}
             for i, q in enumerate(questions)]
    try:
        r = _chat_json(
            f"You are a senior translator of government recruitment exam papers into {lang}. Check each {lang} "
            f"version against the English and rewrite it where needed so it reads exactly like an official "
            f"{lang}-medium question paper: correct official terminology (constitutional terms, offices, laws, "
            "scientific and mathematical terms), natural grammar, same meaning, same order of options. "
            'Return ONLY JSON: {"items": [{"i": n, "text_local": "...", "options_local": ["...","...","...","..."], '
            '"explanation_local": "..."}]}',
            json.dumps(items, ensure_ascii=False), model=JOBS_TRANSLATE_MODEL)
        for it in r.get("items") or []:
            i = int(it.get("i", -1))
            if 0 <= i < len(questions) and isinstance(it.get("text_local"), str) and len(it.get("options_local") or []) == 4:
                questions[i].update({k: it[k] for k in ("text_local", "options_local", "explanation_local") if it.get(k)})
    except Exception as exc:
        logger.warning("[jobs] Translation review skipped: %s", exc)
    return questions


def _bilingual(en: str, local: str | None) -> str:
    """English, then the local-language line — once only when they're the same (numbers, formulas)."""
    en, local = en.strip(), (local or "").strip()
    return f"{en}\n{local}" if local and local != en else en


def generate_questions(exam: str, exam_label: str, subject: str, lang: str | None, n: int,
                       avoid: list[str]) -> list[dict]:
    """n verified questions, bilingual when lang is set, in question-service format."""
    system = _SYSTEM_QUESTIONS.format(
        exam_label=exam_label,
        language_rule=_LANG_BILINGUAL.format(lang=lang) if lang else _LANG_ENGLISH)
    avoid_note = ("Do not repeat these questions:\n" + "\n".join(f"- {a[:120]}" for a in avoid[:80])) if avoid else ""
    out: list[dict] = []   # raw verified questions; formatted for question-service at the end
    for _ in range(2):   # a second batch tops up whatever the checks dropped
        need = n - len(out)
        if need <= 0:
            break
        try:
            data = _chat_json(system, _USER_QUESTIONS.format(exam=exam, subject=subject, n=need + 3, avoid=avoid_note),
                              temperature=0.8)
        except Exception as exc:
            logger.warning("[jobs] Question generation failed: %s", exc)
            continue
        for q in data.get("questions") or []:
            try:
                q["correct"] = int(q["correct"])
                ok = (isinstance(q.get("text_en"), str) and len(q.get("options_en") or []) == 4
                      and 0 <= q["correct"] <= 3 and len(set(map(str, q["options_en"]))) == 4)
                if lang:
                    ok = ok and isinstance(q.get("text_local"), str) and len(q.get("options_local") or []) == 4
            except (KeyError, TypeError, ValueError):
                ok = False
            if not ok or not _verify_answer(q):
                continue
            out.append(q)
            if len(out) >= n:
                break
    if lang and out:
        out = _review_translations(out, lang)
    return [{
        "text":          _bilingual(q["text_en"], q.get("text_local") if lang else None)[:1000],
        "options":       [{"text": _bilingual(str(e), str(l) if lang and l else None)[:500]}
                          for e, l in zip(q["options_en"], q.get("options_local") or [None] * 4)],
        "correctOption": q["correct"],
        "description":   _bilingual(q.get("explanation_en") or "", q.get("explanation_local") if lang else None)[:2000],
    } for q in out]


def _save_questions(questions: list[dict], topic_id: str, sub_id: str | None) -> list[str]:
    from auth_client import auth_headers, reset_token
    from config import QUESTION_API_URL
    ids = []
    for q in questions:
        # Inactive + origin: used only by this quiz, kept out of random selection and the approval queue
        payload = {**q, "topic": topic_id, "subTopic": sub_id, "difficulty": "medium",
                   "isActive": False, "origin": "job_practice"}
        for attempt in range(2):
            r = requests.post(f"{QUESTION_API_URL}/api/questions", json=payload, headers=auth_headers(), timeout=20)
            if r.status_code == 401 and attempt == 0:
                reset_token()
                continue
            if r.ok:
                ids.append(r.json()["question"]["_id"])
            else:
                logger.info("[jobs] Question not saved (%s): %s", r.status_code, r.text[:120])
            break
    return ids


def _series_question_texts(quizzes: list[dict]) -> list[str]:
    """English question texts already used in this series (newest quiz first)."""
    texts = []
    for q in reversed(quizzes):
        try:
            r = requests.get(f"{QUIZ_API_URL}/api/quizzes/{q['_id']}/questions", timeout=20)
            texts += [x.get("text", "").split("\n")[0] for x in r.json().get("questions", [])]
        except Exception:
            continue
    return [t for t in texts if t]


def _create_day_quiz(post: dict, exam_type: str, state: str | None, day_no: int, opens: datetime,
                     subs: list[dict], previous: list[dict]) -> bool:
    """Generate today's questions and create the 24-hour quiz with them."""
    from daily_games import _quiz_request
    label = EXAM_TYPES[exam_type][0]
    lang = _language_for(state)
    topic, sub, subject = _subject_plan(exam_type, state)[day_no - 1]
    topic_ids = {s["topicName"]: s["topicId"] for s in subs}
    sub_ids = {(s["topicName"], s["name"]): s["_id"] for s in subs}
    topic_id, sub_id = topic_ids.get(topic), (sub_ids.get((topic, sub)) if sub else None)
    if not topic_id:
        topic_id, sub_id = topic_ids.get(_GS), None

    from daily_games import _available_questions
    avoid = _series_question_texts(previous)
    try:
        avoid += _available_questions({"topic_id": topic_id, "subtopic_id": sub_id})[:20]
    except Exception:
        pass
    exam = post.get("title") or f"{label} recruitment"
    questions = generate_questions(exam, label, subject, lang, JOB_QUIZ_QUESTIONS, avoid)
    ids = _save_questions(questions, topic_id, sub_id)
    if len(ids) < JOB_QUIZ_MIN_QUESTIONS:
        logger.error("[jobs] %s day %d: only %d questions passed the checks — quiz not created.",
                     _series_title(post), day_no, len(ids))
        return False

    quiz = _quiz_request("POST", "/api/quizzes", {
        "title":                _series_title(post),
        "description":          _series_description(post, lang),
        "questionCount":        len(ids),
        "selectionMode":        "manual",
        "timezone":             "Asia/Kolkata",
        "scheduledAt":          opens.astimezone(timezone.utc).isoformat(),
        "durationMinutes":      24 * 60,
        "timeLimitPerQuestion": None,
        "scheduleType":         "once",
        "participation":        "public",
    })["quiz"]
    try:
        _quiz_request("POST", f"/api/quizzes/{quiz['_id']}/questions", {"questionIds": ids})   # full → scheduled
    except Exception:
        _quiz_request("DELETE", f"/api/quizzes/{quiz['_id']}", {})   # never leave a half-made draft behind
        raise
    if post.get("image"):
        _quiz_request("PATCH", f"/api/quizzes/{quiz['_id']}", {"image": post["image"]})
    logger.info("✅ [jobs] '%s' day %d/%d (%s%s): %d questions, opens %s IST",
                _series_title(post), day_no, JOB_SERIES_DAYS, subject.split(" (")[0],
                f", English + {lang}" if lang else "", len(ids), opens.astimezone(IST).strftime("%d %b %H:%M"))
    return True


def _post_state(post: dict) -> str | None:
    m = re.search(r"State government — ([^<]+)</li>", post.get("content") or "")
    return html.unescape(m.group(1)).strip() if m else None


def run_series_check() -> int:
    """For every approved job post still inside its series window, make sure the next 24-hour quiz
    exists. Returns quizzes created."""
    from topic_client import fetch_all_subtopics
    try:
        posts = requests.get(f"{POST_API_URL}/api/posts", params={"topic": JOBS_TOPIC, "limit": 50},
                             timeout=20).json().get("posts", [])
        quizzes = requests.get(f"{QUIZ_API_URL}/api/quizzes", timeout=20).json().get("quizzes", [])
    except Exception as exc:
        logger.error("[jobs] Could not load posts/quizzes: %s", exc)
        return 0
    by_label = {label: key for key, (label, _) in EXAM_TYPES.items()}
    now = datetime.now(timezone.utc)
    subs, created = None, 0
    for post in posts:
        exam_type = by_label.get(post.get("subTopic"))
        approved = _parse_time(post.get("createdAt"))   # approval resets createdAt to approval time
        if not exam_type or not approved or now - approved > timedelta(days=JOB_SERIES_DAYS):
            continue
        title = _series_title(post)
        mine = sorted((q for q in quizzes if q.get("title") == title and q.get("status") != "cancelled"),
                      key=lambda q: q["scheduledAt"])
        if len(mine) >= JOB_SERIES_DAYS:
            continue
        if mine:
            last_end = _parse_time(mine[-1]["scheduledAt"]) + timedelta(minutes=mine[-1].get("durationMinutes") or 0)
            if last_end - now > timedelta(minutes=_SERIES_LEAD_MINUTES):
                continue                      # today's quiz still has a while to run
            opens = max(last_end, now + timedelta(minutes=2))
        else:
            opens = now + timedelta(minutes=2)
        subs = subs or fetch_all_subtopics()
        try:
            if _create_day_quiz(post, exam_type, _post_state(post), len(mine) + 1, opens, subs, mine):
                created += 1
        except Exception as exc:
            logger.error("[jobs] '%s' day %d failed: %s", title, len(mine) + 1, exc)
    return created


def _parse_time(value) -> datetime | None:
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


# ── run ───────────────────────────────────────────────────────────────────────

def run_jobs() -> int:
    """Find new notifications and save job posts (pending approval). Returns posts saved."""
    from notifier import send_approval_email
    from pinecone_client import post_exists, upsert_post
    from post_client import save_post

    logger.info("=== Jobs agent started ===")
    try:
        jobs = extract_jobs(fetch_headlines())
    except Exception as exc:
        logger.error("[jobs] Could not fetch/extract jobs: %s", exc)
        return 0

    saved = 0
    for job in jobs:
        if saved >= JOBS_PER_RUN:
            break
        key = f"{job['organisation']} {job['post']} recruitment {job['state'] or ''}".strip()
        try:
            embedding = embed_text(key)
        except Exception as exc:
            logger.error("[jobs] Embedding failed: %s", exc)
            continue
        exists, matched = post_exists(embedding)
        if exists:
            logger.info("[jobs] Already posted (%s): %s", matched, key)
            continue

        post_data = write_post(job)
        if not post_data:
            continue
        image_url = _job_image(job, post_data["label"]) if IMAGE_ENABLED else None
        post = save_post(title=post_data["title"], content=post_data["content"], image_url=image_url,
                         topic_name=JOBS_TOPIC, subtopic_name=post_data["label"], seo=post_data["seo"],
                         slug=post_data["slug"])
        if not post:
            continue
        send_approval_email(post=post, title=post_data["title"], content=post_data["content"], image_url=image_url,
                            topic_name=JOBS_TOPIC, subtopic_name=post_data["label"],
                            mode="job alert", level="—", region="india")
        upsert_post(post_id=post["_id"], embedding=embedding, metadata={
            "post_id": post["_id"], "title": post_data["title"], "topic": JOBS_TOPIC,
            "subtopic": post_data["label"], "mode": "job", "job_key": key,
        })
        saved += 1
        logger.info("✅ [jobs] Saved: '%s'", post_data["title"][:90])

    logger.info("=== Jobs agent finished (%d job post(s)) ===", saved)
    return saved


if __name__ == "__main__":
    import argparse

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    p = argparse.ArgumentParser(description="Meenzo government-jobs agent")
    p.add_argument("--dry-run", action="store_true", help="print the posts it would write; save nothing")
    args = p.parse_args()
    if not args.dry_run:
        run_jobs()
        run_series_check()
    else:
        for job in extract_jobs(fetch_headlines())[:JOBS_PER_RUN]:
            print("\n" + "=" * 80)
            print(json.dumps({k: v for k, v in job.items() if k != "headlines"}, ensure_ascii=False))
            print("headlines:", [h["title"] for h in job["headlines"]])
            data = write_post(job)
            if data:
                print("TITLE:", data["title"], "| slug:", data["slug"])
                print(re.sub(r"<[^>]+>", "\n", data["content"]).replace("\n\n", "\n"))
                print("quiz:", _series_title({"title": data["title"]}), "| language:", _language_for(job["state"]) or "English")
                print("plan:", [subj.split(" (")[0] for _, _, subj in _subject_plan(job["exam_type"], job["state"])])
