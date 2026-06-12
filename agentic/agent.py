"""
Main agent job: pick random subtopics → generate question → embed →
check Pinecone for duplicates → if new, save to Pinecone + backend.
"""
import logging
import random
from topic_client import fetch_all_subtopics
from openai_client import generate_question, embed_text
from pinecone_client import question_exists, upsert_question
from question_client import save_question
from config import SUBTOPICS_PER_RUN

logger = logging.getLogger(__name__)


def run_agent() -> None:
    logger.info("=== Agent job started ===")

    try:
        subtopics = fetch_all_subtopics()
    except Exception as exc:
        logger.error("Could not fetch subtopics: %s", exc)
        return

    if not subtopics:
        logger.warning("No active subtopics found. Skipping.")
        return

    selected = random.sample(subtopics, min(SUBTOPICS_PER_RUN, len(subtopics)))
    logger.info("Processing %d subtopics: %s", len(selected), [s["name"] for s in selected])

    for subtopic in selected:
        topic_name   = subtopic["topicName"]
        subtopic_name = subtopic["name"]
        topic_id     = subtopic["topicId"]
        subtopic_id  = subtopic["_id"]

        logger.info("Generating question for '%s > %s'…", topic_name, subtopic_name)
        question = generate_question(topic_name, subtopic_name)
        if not question:
            logger.warning("No question generated for '%s'. Skipping.", subtopic_name)
            continue

        try:
            embedding = embed_text(question["text"])
        except Exception as exc:
            logger.error("Embedding failed for '%s': %s", subtopic_name, exc)
            continue

        exists, matched_id = question_exists(embedding)
        if exists:
            logger.info(
                "Duplicate question detected (matched=%s) for '%s'. Skipping.",
                matched_id, subtopic_name,
            )
            continue

        saved = save_question(question, topic_id, subtopic_id)
        if not saved:
            logger.error("Backend save failed for '%s'. Skipping Pinecone upsert.", subtopic_name)
            continue

        upsert_question(
            question_id=saved["_id"],
            embedding=embedding,
            metadata={
                "question_id": saved["_id"],
                "topic":       topic_name,
                "subtopic":    subtopic_name,
                "difficulty":  question.get("difficulty", "medium"),
            },
        )
        logger.info(
            "Question '%s…' saved for '%s > %s'.",
            question["text"][:60], topic_name, subtopic_name,
        )

    logger.info("=== Agent job finished ===")
