"""
LangChain LCEL chain for quiz question generation with RAG context.
- Engineering topics  → standard technical questions
- Each topic is written in the style of the Indian exams it serves (GATE/PSU, SSC, Banking,
  Police, State and Central Government exams, campus placements)
- Aptitude/Reasoning answers are re-solved independently and rejected on disagreement
"""
import logging
import re
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser, StrOutputParser
from config import OPENAI_API_KEY
from rag_store import get_similar_questions

logger = logging.getLogger(__name__)

_llm = ChatOpenAI(model="gpt-4o-mini", api_key=OPENAI_API_KEY, temperature=0.7)

_SYSTEM = (
    "You are a quiz content creator. Generate unique multiple-choice questions.\n"
    "Return ONLY valid JSON — no markdown fences, no extra text — in this exact format:\n"
    '{{\n'
    '  "text": "<the question>",\n'
    '  "description": "<explanation of the correct answer, 1-3 sentences; for calculations, the short working>",\n'
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
    "{exam_instruction}"
    "\nExisting questions for this subtopic (DO NOT duplicate or closely resemble these):\n"
    "{existing_questions}\n\n"
    "Generate ONE new, factually accurate, unambiguous multiple-choice question.\n"
    "Rules:\n"
    "- Exactly one option is correct; the other three are plausible but clearly wrong.\n"
    "- Use only settled, textbook-level facts — no current affairs or events after 2023.\n"
    "- Indian English spelling (colour, centre, programme).\n"
    "- Exactly 4 options.\n"
    "- correctOption is the 0-based index of the right answer.\n"
    "- difficulty: easy (recall), medium (understanding), hard (analysis/application)."
)

_prompt = ChatPromptTemplate.from_messages([("system", _SYSTEM), ("human", _HUMAN)])
_chain  = _prompt | _llm | JsonOutputParser()

# Exam style per topic (by topic name, lower-case). Unknown topics get no extra guidance.
_EXAM_STYLE = {
    "engineering": (
        "Write it like a GATE question (also used for PSU recruitment through GATE, e.g. NTPC, BHEL, ONGC, IOCL, "
        "and state AE/JE exams): conceptual or short numerical, at undergraduate engineering level."
    ),
    "general studies": (
        "Write it like a General Studies question in SSC (CGL, CHSL, MTS), State SSC, banking (IBPS, SBI PO/Clerk), "
        "police constable/SI and State/Central Government recruitment exams. Focus on India — Indian history, "
        "places, Constitution, economy, science and well-known facts."
    ),
    "non engineering": (
        "Write it like a General Studies question in SSC, banking, police and government exams. Focus on India."
    ),
    "aptitude & reasoning": (
        "Write it like a question from SSC, banking (IBPS, SBI), police, PSU or private-company recruitment aptitude "
        "tests. Use Indian context (₹, Indian names and places). For calculations, keep the numbers clean so it can "
        "be solved in under a minute without a calculator, and put the short working in the description."
    ),
    "programming": (
        "Write it like a question from campus-placement and IT company tests (e.g. TCS NQT, Infosys, Wipro, "
        "Accenture) or a fresher technical interview: predict-the-output, concept or short code-reasoning. "
        "If you include code, keep it short and correct, on separate lines with normal indentation — "
        "no markdown fences or backticks (the quiz screen shows plain text)."
    ),
}
# Subtopics whose answers are re-solved independently before saving
_VERIFY_SUBTOPICS = {"quantitative aptitude", "logical reasoning"}

_verify_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a careful exam solver. Solve the question yourself, step by step, then end with a "
               "final line exactly like: ANSWER: <0-based index of the correct option>"),
    ("human", "{question}\n\nOptions:\n{options}"),
])
_verify_chain = _verify_prompt | ChatOpenAI(model="gpt-4o-mini", api_key=OPENAI_API_KEY, temperature=0) | StrOutputParser()


def _independently_agrees(data: dict) -> bool:
    options = "\n".join(f"{i}. {o['text']}" for i, o in enumerate(data["options"]))
    try:
        reply = _verify_chain.invoke({"question": data["text"], "options": options})
        found = re.findall(r"ANSWER:\s*([0-3])", reply)
        return bool(found) and int(found[-1]) == data["correctOption"]
    except Exception as exc:
        logger.warning("Verification failed to run (%s) — rejecting to be safe", exc)
        return False


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

    style = _EXAM_STYLE.get(topic_name.strip().lower())
    exam_instruction = f"Exam style: {style}\n" if style else ""

    try:
        data = _chain.invoke({
            "topic": topic_name,
            "subtopic": subtopic_name,
            "exam_instruction": exam_instruction,
            "existing_questions": _format_existing(existing),
        })
        assert isinstance(data.get("text"), str) and data["text"]
        assert isinstance(data.get("options"), list) and len(data["options"]) == 4
        assert data.get("correctOption") in (0, 1, 2, 3)
        assert data.get("difficulty") in ("easy", "medium", "hard")
        if subtopic_name.strip().lower() in _VERIFY_SUBTOPICS and not _independently_agrees(data):
            logger.warning("Rejected '%s' question: independent solve disagrees with the given answer", subtopic_name)
            return None
        return data
    except Exception as exc:
        logger.error("Question generation failed for '%s': %s", subtopic_name, exc)
        return None
