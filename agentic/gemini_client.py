"""
Generate quiz questions via Google Gemini and produce embeddings.
"""
import json
import logging
from google import genai
from google.genai import types
from config import GEMINI_API_KEY, CHAT_MODEL, EMBED_MODEL, EMBED_DIM

logger = logging.getLogger(__name__)
client = genai.Client(api_key=GEMINI_API_KEY)


def generate_question(topic_name: str, subtopic_name: str) -> dict | None:
    """
    Ask Gemini to generate one multiple-choice question for the given subtopic.
    Returns a dict with keys: text, description, options, correctOption (0-3), difficulty
    """
    prompt = f"""
You are a quiz content creator. Generate ONE high-quality multiple-choice question for:

Topic: {topic_name}
Subtopic: {subtopic_name}

Return ONLY valid JSON in exactly this format (no markdown, no extra text):
{{
  "text": "<the question>",
  "description": "<explanation of the correct answer, 1-3 sentences>",
  "options": [
    {{"text": "<option A>"}},
    {{"text": "<option B>"}},
    {{"text": "<option C>"}},
    {{"text": "<option D>"}}
  ],
  "correctOption": <0|1|2|3>,
  "difficulty": "<easy|medium|hard>"
}}

Rules:
- The question must be factually accurate and unambiguous.
- Exactly 4 options.
- correctOption is the 0-based index of the right answer.
- difficulty: easy (recall), medium (understanding), hard (analysis/application).
"""

    try:
        response = client.models.generate_content(
            model=CHAT_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.7,
                response_mime_type="application/json",
            ),
        )
        raw = response.text.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        # Validate structure
        assert isinstance(data.get("text"), str) and data["text"]
        assert isinstance(data.get("options"), list) and len(data["options"]) == 4
        assert data.get("correctOption") in (0, 1, 2, 3)
        assert data.get("difficulty") in ("easy", "medium", "hard")
        return data
    except Exception as exc:
        logger.error("Gemini question generation failed: %s", exc)
        return None


def embed_text(text: str) -> list[float]:
    """Return an embedding vector for the given text."""
    response = client.models.embed_content(
        model=EMBED_MODEL,
        contents=text,
        config=types.EmbedContentConfig(output_dimensionality=EMBED_DIM),
    )
    return response.embeddings[0].values
