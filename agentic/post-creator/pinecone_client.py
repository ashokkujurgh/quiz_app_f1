"""
Pinecone index management for posts — init, duplicate check, upsert.
"""
import logging
from pinecone import Pinecone, ServerlessSpec
from config import (
    PINECONE_API_KEY, PINECONE_INDEX,
    PINECONE_CLOUD, PINECONE_REGION,
    EMBED_DIM, SIMILARITY_THRESHOLD,
)

logger = logging.getLogger(__name__)

_index = None


def get_index():
    global _index
    if _index is not None:
        return _index

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
    _index = pc.Index(PINECONE_INDEX)
    logger.info("Pinecone post index ready: %s", PINECONE_INDEX)
    return _index


def post_exists(embedding: list[float]) -> tuple[bool, str | None]:
    """
    Returns (exists, matched_post_id).
    A cosine score above SIMILARITY_THRESHOLD means the post already exists.
    """
    index = get_index()
    result = index.query(vector=embedding, top_k=1, include_metadata=True)
    matches = result.get("matches", [])
    if matches and matches[0]["score"] >= SIMILARITY_THRESHOLD:
        matched_id = matches[0]["metadata"].get("post_id")
        logger.info("Duplicate post detected (score=%.4f, id=%s)", matches[0]["score"], matched_id)
        return True, matched_id
    return False, None


def upsert_post(post_id: str, embedding: list[float], metadata: dict) -> None:
    """Store a post embedding + metadata in Pinecone."""
    index = get_index()
    index.upsert(vectors=[{"id": post_id, "values": embedding, "metadata": metadata}])
    logger.info("Upserted post %s into Pinecone.", post_id)
