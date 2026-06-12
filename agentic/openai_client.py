"""
Generate quiz questions via OpenAI and produce embeddings.
"""
import json
import logging
from openai import OpenAI
from config import OPENAI_API_KEY, EMBED_MODEL

logger = logging.getLogger(__name__)
client = OpenAI(api_key=OPENAI_API_KEY)


def generate_question(topic_name: str, subtopic_name: str) -> dict | None:
    """
    Ask GPT to generate one multiple-choice question for the given subtopic.
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
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=600,
        )
        raw = response.choices[0].message.content.strip()
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
        logger.error("OpenAI question generation failed: %s", exc)
        return None


def embed_text(text: str) -> list[float]:
    """Return an embedding vector for the given text."""
    response = client.embeddings.create(model=EMBED_MODEL, input=text)
    return response.data[0].embedding
