"""
Meme-post agent: funny, educational memes — each one in Hindi OR English.

Each meme teaches ONE textbook fact from a subtopic:
1. Pick subtopics (current affairs excluded — facts must be verifiable) and a language per meme
2. Brainstorm several memes (20-60 words of meme text + a text-free scene) in one call; an editor
   scores them all and keeps the best one that passes
3. Title + SEO for the winner, fact-check it, content-filter it, skip near-duplicates (Pinecone)
4. Draw the scene with the usual image chain (OpenArt → Kie.ai → OpenAI) and put the meme text in a
   band above it ourselves — image models garble text, especially Devanagari
5. Save as a normal post (waits for approval) and email the reviewer. The post is just the meme:
   no explanation section.

Dry run (no upload, no save — writes a PNG and HTML next to you):
    python meme_creator.py --dry-run [--subtopic "Rajasthan GK"] [--lang hi|en] [--no-image]
"""
import html
import io
import json
import logging
import os
import random
import re

from PIL import Image, ImageDraw, ImageFont, features

from config import (MEMES_PER_RUN, MEME_CHAT_MODEL, MEME_CANDIDATES, MEME_ROUNDS, MEME_HINDI_SHARE,
                    IMAGE_ENABLED)
from generator import _client, _fact_check, embed_text, generate_image_from_prompt

logger = logging.getLogger(__name__)

# Facts in these areas change too fast to joke about safely
EXCLUDED_TOPICS = {"current affairs"}

_FONT_DIR   = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")
_FONT_HINDI = os.path.join(_FONT_DIR, "NotoSansDevanagari-Bold.ttf")
_FONT_LATIN = os.path.join(_FONT_DIR, "NotoSans-Bold.ttf")
# Devanagari needs real text shaping (matras, conjuncts). Pillow gets it from libraqm, which
# needs FriBiDi at runtime (libfribidi0 in the Docker image). Without it Hindi renders broken.
_CAN_SHAPE_HINDI = features.check("raqm")

MEME_W, MEME_H = 1600, 900   # 16:9 overall (text band + picture) — the feed and post page crop to this
MIN_WORDS, MAX_WORDS = 20, 60

LANG_NAME = {"hi": "Hindi", "en": "English"}

_SYSTEM_MEME = """\
You create funny EDUCATIONAL memes for Meenzo, a quiz app for Indian students and job-seekers.
Every meme must make people laugh AND carry one real, textbook-correct fact.

HUMOUR:
- Relatable student life in India: last-minute revision, mock-test shock, that one tricky question,
  mixing up two similar facts, the topper friend, chai-and-study nights, parents asking about results.
- Or the absurd/surprising side of the fact itself.
- Use classic meme formats: "Expectation vs Reality", "Nobody: / Me:", "When the teacher asks…",
  "Me before vs after learning X", "POV:", two-choice dilemma, "That one friend who…", a short dialogue.
- Clean and kind: no insults about religion, caste, region, language, gender, body, appearance or
  any real person (no politicians, celebrities or named teachers). No profanity, no double meaning,
  nothing that mocks people who fail or are poor.

EXAMPLES of the level of humour wanted (do not reuse them):
- "Me in the exam hall after forgetting everything I studied all night, staring at the paper like it's in an
  alien language. Brain, suddenly: Mitochondria is the powerhouse of the cell. Thanks, very helpful."
- "टीचर: क्षेत्रफल में भारत का सबसे बड़ा राज्य कौन सा है?\\nराजस्थान वाले बच्चे, कॉलर ऊपर करके: सर, ये सवाल नहीं,
  सम्मान है। पूरा थार रेगिस्तान हमारे यहाँ है!"

THE MEME TEXT ("text"):
- 20 to 60 words. It IS the meme — no explanation, no "the real lesson", no hashtags, no emojis.
- Written entirely in the requested language:
  * Hindi: natural spoken Hindi in Devanagari, the way Indian students talk (common English words written in
    Devanagari are fine, e.g. "एग्जाम", "टॉपर", "सिलेबस"). No Roman letters.
  * English: natural Indian English.
- A complete joke: setup AND punchline; the true fact is readable inside it. Never end on an unanswered question.
- Line breaks ("\\n") only between speakers or between the setup and the punchline — at most 4 lines.
- The picture gets shared on its own, so the text must never contain a false fact — not even as a
  character's line or a "wrong answer" setup. Teachers are never the ones who are wrong.

FACTS:
- Standard textbook knowledge (NCERT, standard references). No current affairs, nothing from the last
  two years, no statistics you are not sure of, no invented quotes or studies.

SCENE (for the illustrator — the picture has NO text at all):
- One funny cartoon scene that matches the joke: expressive Indian characters (students, a teacher, a
  parent) or an object/animal with a human expression. Describe the setting, characters, expressions and
  action in 2-4 sentences, in English. Never ask for text, labels, signs, speech bubbles, letters or numbers,
  and avoid things that usually carry writing (open books, blackboards, posters, screens, maps).
"""

_USER_BRAINSTORM = """Topic: {topic}
Subtopic: {subtopic}
Language of the meme text: {lang}
{avoid}{feedback}
Brainstorm EXACTLY {n} DIFFERENT memes (the "candidates" list must have {n} items), each about a different
specific fact from the standard "{subtopic}" syllabus, using different meme formats. Make every one as funny
as you can — they compete, only the best is used. Each "text" is 20-60 words, entirely in {lang}.

Return ONLY valid JSON:
{{"candidates": [
  {{
    "fact_en": "<the one fact inside the joke, one sentence in English>",
    "text": "<the meme text, 20-60 words, in {lang}>",
    "scene": "<text-free cartoon scene for the illustrator, in English>"
  }}
]}}"""

_USER_TITLE = """This meme was chosen for Meenzo (language: {lang}, subtopic: {subtopic}).
Meme text: {text}
Fact: {fact}

Return ONLY valid JSON:
{{
  "title": "<short catchy post title in {lang}, max 70 chars, no emojis>",
  "slug": "<3-8 English words for the URL, lowercase, hyphen-separated>",
  "seo": {{
    "metaTitle": "<in {lang}, max 60 chars>",
    "metaDescription": "<in {lang}, max 155 chars, say it's a funny meme about the fact>",
    "keywords": ["<5 search keywords>"],
    "ogTitle": "<in {lang}, max 90 chars>",
    "ogDescription": "<in {lang}, max 200 chars>",
    "ogImage": null,
    "canonical": null
  }}
}}"""

_CANDIDATE_KEYS = ("fact_en", "text", "scene")


# ── text ──────────────────────────────────────────────────────────────────────

def _chat_json(messages: list[dict], temperature: float) -> dict:
    resp = _client.chat.completions.create(model=MEME_CHAT_MODEL, temperature=temperature,
                                           response_format={"type": "json_object"}, messages=messages)
    return json.loads(resp.choices[0].message.content)


def pick_language() -> str:
    return "hi" if random.random() < MEME_HINDI_SHARE else "en"


_ROMAN = re.compile(r"[A-Za-z]")
_DEVA  = re.compile(r"[ऀ-ॿ]")


def _text_problems(text: str, lang: str) -> list[str]:
    """Checks code can do without a model."""
    problems = []
    words = len(text.split())
    if not MIN_WORDS <= words <= MAX_WORDS:
        problems.append(f"the meme text is {words} words — it must be {MIN_WORDS}-{MAX_WORDS}")
    if lang == "hi" and _ROMAN.search(text):
        problems.append("the Hindi meme contains Roman letters — write every word in Devanagari")
    if lang == "en" and _DEVA.search(text):
        problems.append("the English meme contains Hindi script")
    if text.count("\n") > 3:
        problems.append("too many line breaks (max 4 lines)")
    return problems


def _brainstorm(topic_name: str, subtopic_name: str, lang: str, avoid: str, feedback: str) -> list[dict]:
    """MEME_CANDIDATES memes in one call; drops incomplete ones and ones that break the text rules."""
    data = _chat_json([
        {"role": "system", "content": _SYSTEM_MEME},
        {"role": "user", "content": _USER_BRAINSTORM.format(
            topic=topic_name, subtopic=subtopic_name, lang=LANG_NAME[lang], avoid=avoid,
            feedback=feedback, n=MEME_CANDIDATES)},
    ], temperature=1.0)
    out, dropped = [], []
    for c in data.get("candidates") or []:
        if not (isinstance(c, dict) and all(isinstance(c.get(k), str) and c[k].strip() for k in _CANDIDATE_KEYS)):
            continue
        c = {k: c[k].strip() for k in _CANDIDATE_KEYS}
        problems = _text_problems(c["text"], lang)
        (dropped if problems else out).append((c, problems) if problems else c)
    if dropped:
        logger.info("[meme] Dropped %d candidate(s): %s", len(dropped), "; ".join(p[0] for _, p in dropped))
    return out


def _pick_best(candidates: list[dict], lang: str) -> tuple[list[dict], str]:
    """Editor scores every candidate in one call. Returns (passing candidates, best first; feedback)."""
    listing = "\n\n".join(f"#{i}\nMeme: {c['text']}\nFact: {c['fact_en']}" for i, c in enumerate(candidates))
    try:
        r = _chat_json([
            {"role": "system", "content": (
                f"You are a tough editor of a popular Indian student meme page. These memes are in {LANG_NAME[lang]}. "
                "Score EVERY meme. funny: 1-10, would Indian students actually laugh or share it (a clear punchline, "
                f"not a plain fact or a pun that makes no sense). language: 1-10, does it read like natural "
                f"{LANG_NAME[lang]} the way Indian students really talk. true: is every statement in the meme and the "
                "fact correct textbook knowledge. "
                'Return ONLY JSON: {"scores": [{"index": n, "funny": n, "language": n, "true": true|false, '
                '"problem": "<short, specific>"}]}'
            )},
            {"role": "user", "content": listing},
        ], temperature=0)
    except Exception as exc:
        logger.warning("[meme] Editor could not run: %s", exc)
        return [], ""
    scored = []
    for sc in r.get("scores") or []:
        try:
            i, funny, natural = int(sc["index"]), int(sc["funny"]), int(sc["language"])
        except (KeyError, TypeError, ValueError):
            continue
        if 0 <= i < len(candidates):
            scored.append((funny, natural, sc.get("true") is True, i, str(sc.get("problem") or "")))
    passing = [s for s in scored if s[0] >= 7 and s[1] >= 7 and s[2]]
    logger.info("[meme] Editor scores (funny/language): %s",
                ", ".join(f"#{i} {f}/{n}{'' if t else ' ✗fact'}" for f, n, t, i, _ in scored))
    if passing:
        return [candidates[s[3]] for s in sorted(passing, key=lambda s: (s[0], s[1]), reverse=True)], ""
    worst_first = sorted(scored, key=lambda s: s[0] + s[1])
    feedback = "; ".join(f'"{candidates[i]["text"][:80]}…" — {p}' for _, _, _, i, p in worst_first[:3] if p)
    return [], feedback


def generate_meme(topic_name: str, subtopic_name: str, recent_titles: list[str] | None = None,
                  lang: str | None = None) -> dict | None:
    """Brainstorm candidates, let the editor pick the best, title and fact-check it.
    Returns the meme dict (with 'title', 'slug', 'content' HTML, 'lang') or None."""
    lang = lang or pick_language()
    avoid = ("Pick facts different from these recent posts: " + "; ".join(recent_titles[:12]) + "."
             if recent_titles else "")
    try:
        passing, feedback = [], ""
        for rnd in range(MEME_ROUNDS):
            note = ("\nThe editor rejected the last batch: " + feedback + ". Do better — sharper punchlines, "
                    "more relatable, more natural language.") if feedback else ""
            candidates = _brainstorm(topic_name, subtopic_name, lang, avoid, note)
            if not candidates:
                logger.warning("[meme] Round %d: no usable candidates.", rnd + 1)
                continue
            passing, feedback = _pick_best(candidates, lang)
            if passing:
                break
            logger.warning("[meme] Round %d: none of %d candidates passed.", rnd + 1, len(candidates))
        if not passing:
            logger.error("[meme] No candidate passed the editor for '%s' — skipping.", subtopic_name)
            return None

        # Best first; if the fact-check sinks one, the runner-up gets its turn
        for rank, chosen in enumerate(passing[:2], 1):
            logger.info("[meme] Trying #%d pick (%s): \"%s\"", rank, lang, chosen["text"].replace("\n", " / ")[:120])
            if _fact_check(subtopic_name, _FACT_NOTE + _check_text(chosen)):
                logger.warning("[meme] Fact-check rejected this pick.")
                continue
            meta = _chat_json([{"role": "user", "content": _USER_TITLE.format(
                lang=LANG_NAME[lang], subtopic=subtopic_name, text=chosen["text"], fact=chosen["fact_en"])}],
                temperature=0.7)
            title = (meta.get("title") or "").strip()[:140] or chosen["text"].split("\n")[0][:70]
            return {**chosen, "lang": lang, "title": title,
                    "slug": (meta.get("slug") or "").strip() or None,
                    "seo": meta.get("seo"), "content": _meme_html(chosen["text"])}
        return None
    except Exception as exc:
        logger.error("[meme] Generation failed for '%s': %s", subtopic_name, exc)
        return None


_FACT_NOTE = ("(Every statement below counts as a claim — including lines spoken by characters in the "
              "meme. Flag absolute claims such as 'only', 'first', 'largest' unless they are standard textbook facts.)\n")


def _check_text(m: dict) -> str:
    """Everything a reader might take as a fact, for the fact-check / filter / embedding."""
    return f"Fact: {m['fact_en']}\nMeme: {m['text']}"


def _meme_html(text: str) -> str:
    """The post body is just the meme text, one paragraph per line."""
    return "".join(f"<p><strong>{html.escape(line.strip())}</strong></p>" for line in text.split("\n") if line.strip())


# ── image ─────────────────────────────────────────────────────────────────────

def _scene_prompt(m: dict) -> str:
    return (
        "A funny, colourful cartoon illustration for an educational meme on a learning app for Indian students.\n"
        f"Scene: {m['scene']}\n"
        f"The joke ({LANG_NAME.get(m.get('lang'), 'English')}): {m['text']}\n\n"
        "Style: bold clean cartoon / comic illustration, exaggerated funny facial expressions, bright cheerful "
        "colours, simple background, wide landscape composition with the characters and their faces in the "
        "vertical middle of the frame (the top and bottom edges may be cropped). "
        "Full-bleed: the artwork fills the whole canvas edge to edge — no border, frame, margin or panel outline. "
        "Absolutely NO text, letters, numbers, words, scribbles, speech bubbles, signs, labels, logos or "
        "watermarks; book covers, boards and screens must be blank."
    )


def _trim_border(img: Image.Image) -> Image.Image:
    """Image models sometimes add a plain white/solid frame; crop to the artwork inside it."""
    from PIL import ImageChops
    bg = Image.new(img.mode, img.size, img.getpixel((0, 0)))
    diff = ImageChops.difference(img, bg).convert("L").point(lambda v: 255 if v > 24 else 0)
    box = diff.getbbox()
    if not box:
        return img
    w, h = box[2] - box[0], box[3] - box[1]
    # Only when it really is a frame: something trimmed, and the art keeps most of the picture
    if (w, h) != img.size and w >= img.width * 0.6 and h >= img.height * 0.6:
        return img.crop(box)
    return img


def _cover(img: Image.Image, w: int, h: int) -> Image.Image:
    scale = max(w / img.width, h / img.height)
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    left, top = (img.width - w) // 2, (img.height - h) // 2
    return img.crop((left, top, left + w, top + h))


def _placeholder_background(h: int) -> Image.Image:
    """Plain brand gradient — used when no illustration could be generated."""
    col = Image.new("RGB", (1, h))
    for y in range(h):   # navy → teal
        t = y / h
        col.putpixel((0, y), (int(17 * (1 - t)), int(29 + t * 151), int(74 + t * 96)))
    return col.resize((MEME_W, h))


def _font(path: str, size: int) -> ImageFont.FreeTypeFont:
    engine = ImageFont.Layout.RAQM if _CAN_SHAPE_HINDI else ImageFont.Layout.BASIC
    return ImageFont.truetype(path, size, layout_engine=engine)


def _is_deva(ch: str) -> bool:
    o = ord(ch)
    return 0x0900 <= o <= 0x097F or 0xA8E0 <= o <= 0xA8FF or 0x1CD0 <= o <= 0x1CFF or o in (0x200C, 0x200D)


class _Fonts:
    """Hindi + Latin fonts at one size. The Devanagari font has no Latin letters, digits or
    punctuation, so each caption is drawn as runs, each in the font that has its glyphs."""

    def __init__(self, size: int):
        self.size = size
        self.hindi = _font(_FONT_HINDI, size)
        self.latin = _font(_FONT_LATIN, size)

    def runs(self, text: str) -> list[tuple[ImageFont.FreeTypeFont, str]]:
        out: list[tuple[ImageFont.FreeTypeFont, str]] = []
        for ch in text:
            # spaces stay with the run they're in, so words keep their shaping context
            font = out[-1][0] if (ch == " " and out) else (self.hindi if _is_deva(ch) else self.latin)
            if out and out[-1][0] is font:
                out[-1] = (font, out[-1][1] + ch)
            else:
                out.append((font, ch))
        return out

    def length(self, text: str) -> float:
        return sum(f.getlength(t) for f, t in self.runs(text))


def _wrap(text: str, fonts: _Fonts, max_w: int) -> list[str]:
    """Word-wrap, keeping the caption's own line breaks (e.g. "Teacher: …" / "Me: …")."""
    lines = []
    for para in text.split("\n"):
        cur = ""
        for word in para.split():
            trial = f"{cur} {word}".strip()
            if fonts.length(trial) <= max_w or not cur:
                cur = trial
            else:
                lines.append(cur)
                cur = word
        if cur:
            lines.append(cur)
    return lines


_BAND_PAD_Y, _MARGIN_X = 34, 60
_LINE_SPACING = 1.42
_MAX_BAND = int(MEME_H * 0.5)   # the meme text never takes more than half; the picture gets the rest


def _layout_band(text: str) -> tuple[_Fonts, list[str], int]:
    """Largest font size at which the meme text fits in _MAX_BAND. Returns (fonts, lines, band height)."""
    max_w = MEME_W - 2 * _MARGIN_X
    for size in range(56, 25, -2):
        fonts = _Fonts(size)
        lines = _wrap(text, fonts, max_w)
        band_h = 2 * _BAND_PAD_Y + int(len(lines) * size * _LINE_SPACING)
        if band_h <= _MAX_BAND:
            return fonts, lines, band_h
    return fonts, lines, _MAX_BAND


def _draw_band(img: Image.Image, fonts: _Fonts, lines: list[str], colour: str = "#111111") -> None:
    draw = ImageDraw.Draw(img)
    line_h = int(fonts.size * _LINE_SPACING)
    y = _BAND_PAD_Y
    for line in lines:
        x = (MEME_W - fonts.length(line)) / 2
        for font, run in fonts.runs(line):
            # anchor "ls" = left/baseline, so Hindi and Latin runs sit on the same line
            draw.text((x, y + fonts.size), run, font=font, anchor="ls", fill=colour)
            x += font.getlength(run)
        y += line_h


def _draw_watermark(img: Image.Image) -> None:
    font = _font(_FONT_LATIN, 26)
    text = "meenzo.com"
    draw = ImageDraw.Draw(img)
    w = font.getlength(text)
    draw.text((MEME_W - w - 24, MEME_H - 40), text, font=font, fill="white",
              stroke_width=2, stroke_fill="black")


def render_meme(m: dict, scene: Image.Image | None) -> bytes:
    """Final meme PNG, 16:9 so the feed doesn't crop it: the meme text in a white band on top,
    the picture below."""
    if m.get("lang") == "hi" and not _CAN_SHAPE_HINDI:
        logger.warning("[meme] No Hindi text shaping (libraqm/FriBiDi missing) — Hindi will render broken.")
    fonts, lines, band_h = _layout_band(m["text"])

    img = Image.new("RGB", (MEME_W, MEME_H), "white")
    pic_h = MEME_H - band_h
    picture = _cover(_trim_border(scene.convert("RGB")), MEME_W, pic_h) if scene else _placeholder_background(pic_h)
    img.paste(picture, (0, band_h))
    _draw_band(img, fonts, lines)
    _draw_watermark(img)
    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    return out.getvalue()


def make_meme_image(m: dict) -> bytes:
    scene = None
    if IMAGE_ENABLED:
        generated = generate_image_from_prompt(_scene_prompt(m))
        if generated:
            try:
                scene = Image.open(io.BytesIO(generated[0]))
            except Exception as exc:
                logger.warning("[meme] Generated scene unreadable: %s", exc)
        if scene is None:
            logger.warning("[meme] No illustration — using a plain background.")
    return render_meme(m, scene)


# ── run ───────────────────────────────────────────────────────────────────────

def run_memes(only_subtopics: list[str] | None = None, count: int | None = None) -> int:
    """One meme run. Returns how many meme posts were saved."""
    # Imported here so --dry-run works without the service clients' env
    from agent import _recent_titles
    from auth_client import upload_image
    from filter_client import is_content_allowed
    from notifier import send_approval_email
    from pinecone_client import post_exists, upsert_post
    from post_client import save_post
    from topic_client import fetch_all_subtopics

    logger.info("=== Meme agent started ===")
    try:
        subtopics = [s for s in fetch_all_subtopics()
                     if s.get("topicName", "").strip().lower() not in EXCLUDED_TOPICS]
    except Exception as exc:
        logger.error("Could not fetch subtopics: %s", exc)
        return 0

    if only_subtopics:
        wanted = {n.strip().lower() for n in only_subtopics}
        candidates = [s for s in subtopics if s["name"].strip().lower() in wanted]
        needed = count or len(candidates)
    else:
        random.shuffle(subtopics)
        needed = count or MEMES_PER_RUN
        candidates = subtopics[: needed + 2]   # spares in case one is dropped

    created = 0
    for sub in candidates:
        if created >= needed:
            break
        topic_name, subtopic_name = sub["topicName"], sub["name"]
        logger.info("[meme] %s > %s", topic_name, subtopic_name)

        meme = generate_meme(topic_name, subtopic_name, _recent_titles(subtopic_name))
        if not meme:
            continue
        text = _check_text(meme)

        try:
            embedding = embed_text(f"{meme['title']}\n{text}")
        except Exception as exc:
            logger.error("[meme] Embedding failed: %s", exc)
            continue
        exists, matched = post_exists(embedding)
        if exists:
            logger.info("[meme] Duplicate of %s — skipping.", matched)
            continue

        allowed, reason = is_content_allowed(f"{meme['title']}\n{text}")
        if not allowed:
            logger.warning("[meme] Blocked by filter: %s", reason)
            continue

        try:
            image_url = upload_image(make_meme_image(meme), "image/png")
        except Exception as exc:
            logger.error("[meme] Image step failed: %s", exc)
            image_url = None
        if not image_url:
            logger.warning("[meme] No image uploaded — a meme needs its picture, skipping.")
            continue

        post = save_post(title=meme["title"], content=meme["content"], image_url=image_url,
                         topic_name=topic_name, subtopic_name=subtopic_name, seo=meme.get("seo"),
                         slug=meme.get("slug"))
        if not post:
            continue

        send_approval_email(post=post, title=meme["title"], content=meme["content"], image_url=image_url,
                            topic_name=topic_name, subtopic_name=subtopic_name,
                            mode="meme", level="foundation", region="india")
        upsert_post(post_id=post["_id"], embedding=embedding, metadata={
            "post_id": post["_id"], "title": meme["title"], "topic": topic_name,
            "subtopic": subtopic_name, "mode": "meme", "lang": meme["lang"],
        })
        created += 1
        logger.info("✅ [MEME/%s] Saved: '%s' (%s > %s)", meme["lang"], meme["title"][:70], topic_name, subtopic_name)

    logger.info("=== Meme agent finished (%d meme post(s)) ===", created)
    return created


if __name__ == "__main__":
    import argparse

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    p = argparse.ArgumentParser(description="Meenzo meme agent")
    p.add_argument("--dry-run", action="store_true", help="write meme.png + meme.html here; save nothing")
    p.add_argument("--topic", default="General Studies")
    p.add_argument("--subtopic", default="Rajasthan GK")
    p.add_argument("--lang", choices=["hi", "en"], help="dry run: force the language (default: random)")
    p.add_argument("--no-image", action="store_true", help="dry run: skip the illustration (plain background)")
    args = p.parse_args()

    if not args.dry_run:
        run_memes([args.subtopic] if args.subtopic else None)
    else:
        meme = generate_meme(args.topic, args.subtopic, lang=args.lang)
        if not meme:
            raise SystemExit("No meme generated (see log).")
        png = render_meme(meme, None) if args.no_image else make_meme_image(meme)
        with open("meme.png", "wb") as fh:
            fh.write(png)
        with open("meme.html", "w", encoding="utf-8") as fh:
            fh.write(f"<meta charset='utf-8'><h1>{html.escape(meme['title'])}</h1>"
                     f"<img src='meme.png' style='max-width:100%'>{meme['content']}")
        print(json.dumps({k: meme[k] for k in ("lang", "title", "slug", "text", "fact_en")},
                         ensure_ascii=False, indent=2))
        print("Hindi shaping available:", _CAN_SHAPE_HINDI, "→ wrote meme.png, meme.html")
