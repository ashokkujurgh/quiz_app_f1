"""
Content policy filter using LangChain + Ollama.

Text: llama3.2 — checks for hate speech, harassment, abuse, self-harm, illegal content.
Image: llava  — checks for nudity, graphic violence, explicit imagery.
"""

import logging
import os
import re
import tempfile
import requests

from langchain_ollama import OllamaLLM
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from nudenet import NudeDetector

from config import OLLAMA_BASE_URL, TEXT_MODEL

logger = logging.getLogger(__name__)

# Initialise NudeNet detector once at startup
_nude_detector = NudeDetector()

# NudeNet v3 label names — block if score > threshold
EXPLICIT_LABELS = {
    "FEMALE_GENITALIA_EXPOSED",
    "MALE_GENITALIA_EXPOSED",
    "FEMALE_BREAST_EXPOSED",
    "ANUS_EXPOSED",
    "BUTTOCKS_EXPOSED",
}
NUDITY_THRESHOLD = 0.5   # confidence score

# ── Rule-based blocklist (catches obvious abuse instantly) ────────────────────
BLOCKED_PATTERNS = [
    # ── English profanity / slurs ─────────────────────────────────────────────
    r"\bfuck(er|ing|ed|s)?\b", r"\bshit(ty)?\b", r"\basshole\b", r"\bbitch(es)?\b",
    r"\bcunt\b", r"\bdick\b", r"\bpussy\b", r"\bcock\b", r"\bwhore\b", r"\bslut\b",
    r"\bnigger\b", r"\bnigga\b", r"\bfaggot\b", r"\bretard\b",
    # ── English violence / explicit ───────────────────────────────────────────
    r"\bkill\s+(you|them|everyone|myself)\b", r"\bi\s+want\s+to\s+kill\b",
    r"\bwant\s+to\s+hurt\b", r"\bwill\s+rape\b", r"\braped?\b",
    r"\bporn(ography)?\b", r"\bnude(s)?\b", r"\bnaked\b", r"\bsex(ual)?\s+content\b",

    # ── Hindi abuses (Roman / Hinglish) ──────────────────────────────────────
    r"\bmadarchod\b", r"\bmadar\s*chod\b", r"\bmc\b",
    r"\bbhenchod\b", r"\bbhen\s*chod\b", r"\bbc\b",
    r"\bchut(i?y[ae]?|iya|iye|iyapa|ya|ye)\b",
    r"\bbehenchod\b", r"\bbehan\s*chod\b",
    r"\bsala(a)?\b", r"\bsaala\b",
    r"\bkamina\b", r"\bkamine\b",
    r"\bharami\b", r"\bhaaram(i|zada)?\b",
    r"\brandi\b", r"\bkutti\b", r"\bkutta\b",
    r"\bgandu\b", r"\bgand\s*mara\b",
    r"\blode\b", r"\blodu\b", r"\blund\b",
    r"\bchod\b", r"\bchodna\b", r"\bchoda\b",
    r"\bbhosdi(ke|wale)?\b", r"\bbhosad\b",
    r"\bmaa\s*ki\s*aankh\b", r"\bteri\s*maa\b", r"\bapni\s*maa\b",
    r"\bsaali\b", r"\bsaale\b",
    r"\bullu\s*ka\s*pattha\b", r"\bullu\b",

    # ── Hindi abuses (Devanagari script) ─────────────────────────────────────
    r"मादरचोद", r"भेनचोद", r"चूतिया", r"हरामी", r"रंडी",
    r"गांडू", r"लोडू", r"लंड", r"भोसड़ी", r"कुत्ता", r"कुत्ती",
    r"साला", r"साली", r"कमीना", r"बकचोद",
]

_COMPILED = [re.compile(p, re.IGNORECASE) for p in BLOCKED_PATTERNS]

def rule_based_check(content: str) -> dict:
    for pattern in _COMPILED:
        m = pattern.search(content)
        if m:
            return {"allowed": False, "reason": f"blocked word detected: '{m.group()}'"}
    return {"allowed": True}

# ── LangChain chains ──────────────────────────────────────────────────────────

text_llm = OllamaLLM(base_url=OLLAMA_BASE_URL, model=TEXT_MODEL, temperature=0)

TEXT_PROMPT = PromptTemplate.from_template(
    """You are a strict content moderation AI for an educational quiz platform called QuizHub.

Analyse the following user-submitted post and determine whether it violates any of these policies:
- Hate speech, racism, sexism, or discrimination
- Harassment, bullying, or personal attacks
- Sexually explicit or pornographic content
- Graphic violence or gore
- Self-harm or suicide encouragement
- Illegal activity promotion
- Spam or misleading information

Post content:
\"\"\"{content}\"\"\"

Respond with EXACTLY one of:
ALLOWED
BLOCKED: <short reason>

Do not add any other text."""
)

text_chain = TEXT_PROMPT | text_llm | StrOutputParser()


def _strip_think(text: str) -> str:
    """Remove <think>...</think> blocks produced by qwen3."""
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


def check_text(content: str) -> dict:
    """Returns {allowed: bool, reason: str|None}"""
    try:
        raw    = text_chain.invoke({"content": content})
        result = _strip_think(raw).strip()
        logger.info("Text filter raw response: %s", result[:120])
        if result.upper().startswith("BLOCKED"):
            reason = result.split(":", 1)[1].strip() if ":" in result else "policy violation"
            return {"allowed": False, "reason": reason}
        return {"allowed": True}
    except Exception as e:
        logger.warning("Text filter error: %s", e)
        return {"allowed": True}  # fail open


def check_image(image_url: str) -> dict:
    """Download image and run NudeNet detection. Returns {allowed, reason}."""
    tmp_path = None
    try:
        r = requests.get(image_url, timeout=10)
        r.raise_for_status()

        # NudeNet v3 requires a file path — write to temp file
        suffix = ".jpg"
        content_type = r.headers.get("Content-Type", "")
        if "png" in content_type:
            suffix = ".png"
        elif "webp" in content_type:
            suffix = ".webp"

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(r.content)
            tmp_path = tmp.name

        detections = _nude_detector.detect(tmp_path)
        logger.info("NudeNet detections for %s: %s", image_url, detections)

        for d in detections:
            label = d.get("class", "")
            score = d.get("score", 0)
            if label in EXPLICIT_LABELS and score >= NUDITY_THRESHOLD:
                return {"allowed": False, "reason": f"explicit imagery detected ({label}, {score:.0%})"}

        return {"allowed": True}
    except Exception as e:
        logger.warning("Image filter error: %s", e)
        return {"allowed": False, "reason": "image could not be verified — upload rejected"}
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


def run_policy_check(content: str, image_url: str | None = None) -> dict:
    """
    Run full content policy check.
    1. Rule-based blocklist  (instant, no model needed)
    2. Ollama LLM check      (deeper semantic analysis)
    3. Image check           (if image_url provided)
    Returns {allowed: bool, reason: str|None, checks: {rules, text, image}}
    """
    # Step 1 — fast rule-based check
    rules_result = rule_based_check(content)
    if not rules_result["allowed"]:
        return {
            "allowed": False,
            "reason":  rules_result["reason"],
            "checks": {"rules": rules_result, "text": {"allowed": True}, "image": {"allowed": True}},
        }

    # Step 2 — Ollama LLM check
    text_result  = check_text(content)
    image_result = {"allowed": True}

    if image_url:
        image_result = check_image(image_url)

    allowed = text_result["allowed"] and image_result["allowed"]
    reason  = text_result.get("reason") or image_result.get("reason")

    return {
        "allowed": allowed,
        "reason":  reason,
        "checks": {
            "rules": rules_result,
            "text":  text_result,
            "image": image_result,
        },
    }
