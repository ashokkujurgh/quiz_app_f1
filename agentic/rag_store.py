"""
Vector store backed by Pinecone via LangChain.
Handles RAG retrieval (fetch existing questions as context) and upsert.
"""
import logging
from pinecone import Pinecone, ServerlessSpec
from langchain_pinecone import PineconeVectorStore
from langchain_openai import OpenAIEmbeddings
from config import (
    OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX,
    PINECONE_CLOUD, PINECONE_REGION, EMBED_MODEL, EMBED_DIM,
    SIMILARITY_THRESHOLD, RAG_CONTEXT_SIZE,
)

logger = logging.getLogger(__name__)

_store: PineconeVectorStore | None = None


def _get_store() -> PineconeVectorStore:
    global _store
    if _store is not None:
        return _store

    pc = Pinecone(api_key=PINECONE_API_KEY)
    existing = [idx.name for idx in pc.list_indexes()]
    if PINECONE_INDEX not in existing:
        logger.info("Creating Pinecone index '%s'…", PINECONE_INDEX)
        pc.create_index(
            name=PINECONE_INDEX,
            dimension=EMBED_DIM,
            metric="cosine",
            spec=ServerlessSpec(cloud=PINECONE_CLOUD, region=PINECONE_REGION),
        )
        logger.info("Index created.")

    embeddings = OpenAIEmbeddings(model=EMBED_MODEL, api_key=OPENAI_API_KEY)
    _store = PineconeVectorStore(
        index=pc.Index(PINECONE_INDEX),
        embedding=embeddings,
        text_key="text",
    )
    logger.info("Pinecone vector store ready: %s", PINECONE_INDEX)
    return _store


def get_similar_questions(subtopic_name: str, k: int = RAG_CONTEXT_SIZE) -> list[str]:
    """Return existing question texts for a subtopic — used as RAG context."""
    store = _get_store()
    try:
        docs = store.similarity_search(
            subtopic_name,
            k=k,
            filter={"subtopic": subtopic_name},
        )
        return [doc.page_content for doc in docs]
    except Exception as exc:
        logger.warning("RAG retrieval failed (returning empty context): %s", exc)
        return []


def question_exists(text: str) -> tuple[bool, str | None]:
    """Return (True, matched_id) if a near-duplicate already exists."""
    store = _get_store()
    try:
        results = store.similarity_search_with_score(text, k=1)
    except Exception as exc:
        logger.warning("Duplicate check failed (assuming new): %s", exc)
        return False, None

    if not results:
        return False, None

    doc, score = results[0]
    logger.info("Top Pinecone score: %.4f (threshold=%.2f)", score, SIMILARITY_THRESHOLD)
    if score >= SIMILARITY_THRESHOLD:
        matched_id = doc.metadata.get("question_id")
        logger.info("Duplicate detected (score=%.4f, id=%s)", score, matched_id)
        return True, matched_id
    return False, None


def upsert_question(question_id: str, text: str, metadata: dict) -> None:
    """Embed and store a question in Pinecone."""
    store = _get_store()
    store.add_texts(
        texts=[text],
        metadatas=[{"question_id": question_id, **metadata}],
        ids=[question_id],
    )
    logger.info("Upserted question %s into Pinecone.", question_id)
