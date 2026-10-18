"""
LangChain LCEL chain for quiz question generation with RAG context.
- Engineering topics  → standard technical questions
- Non Engineering topics → India-focused questions
"""
import logging
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from config import GEMINI_API_KEY, CHAT_MODEL
from rag_store import get_similar_questions

logger = logging.getLogger(__name__)

_llm = ChatGoogleGenerativeAI(model=CHAT_MODEL, google_api_key=GEMINI_API_KEY, temperature=0.7)

_SYSTEM = (
    "You are a quiz content creator. Generate unique multiple-choice questions.\n"
    "Return ONLY valid JSON — no markdown fences, no extra text — in this exact format:\n"
    '{{\n'
    '  "text": "<the question>",\n'
    '  "description": "<explanation of correct answer, 1-3 sentences>",\n'
    '  "options": [\n'
    '    {{"text": "<option A>"}},\n'
    '    {{"text": "<option B>"}},\n'
    '    {{"text": "<option C>"}},\n'
    '    {{"text": "<option D>"}}\n'
    '  ],\n'
    '  "correctOption": <0|1|2|3>,\n'
    '  "difficulty": "<easy|medium|hard>"\n'
    '}}'
)

_HUMAN = (
    "Topic: {topic}\n"
    "Subtopic: {subtopic}\n"
    "{india_instruction}"
    "\nExisting questions for this subtopic (DO NOT duplicate or closely resemble these):\n"
    "{existing_questions}\n\n"
    "Generate ONE new, factually accurate, unambiguous multiple-choice question.\n"
    "Rules:\n"
    "- Exactly 4 options.\n"
    "- correctOption is the 0-based index of the right answer.\n"
    "- difficulty: easy (recall), medium (understanding), hard (analysis/application)."
)

_prompt = ChatPromptTemplate.from_messages([("system", _SYSTEM), ("human", _HUMAN)])
_chain  = _prompt | _llm | JsonOutputParser()

_NON_ENGINEERING_TOPIC = "non engineering"


def _is_non_engineering(topic_name: str) -> bool:
    return topic_name.strip().lower() == _NON_ENGINEERING_TOPIC


def _format_existing(questions: list[str]) -> str:
    if not questions:
        return "None yet — this is the first question for this subtopic."
    return "\n".join(f"- {q}" for q in questions)


def generate_question(topic_name: str, subtopic_name: str) -> dict | None:
    existing = get_similar_questions(subtopic_name)
    logger.info("RAG context for '%s': %d existing question(s)", subtopic_name, len(existing))

    india_instruction = (
        "Context: This is for an India-focused quiz. "
        "The question MUST be about India — Indian events, people, places, laws, or facts.\n"
        if _is_non_engineering(topic_name) else ""
    )

    try:
        data = _chain.invoke({
            "topic": topic_name,
            "subtopic": subtopic_name,
            "india_instruction": india_instruction,
            "existing_questions": _format_existing(existing),
        })
        assert isinstance(data.get("text"), str) and data["text"]
        assert isinstance(data.get("options"), list) and len(data["options"]) == 4
        assert data.get("correctOption") in (0, 1, 2, 3)
        assert data.get("difficulty") in ("easy", "medium", "hard")
        return data
    except Exception as exc:
        logger.error("Question generation failed for '%s': %s", subtopic_name, exc)
        return None
