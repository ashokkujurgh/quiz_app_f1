import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY   = os.getenv("OPENAI_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")

# Backend service URLs
TOPIC_API_URL    = os.getenv("TOPIC_API_URL",    "http://localhost:4002")
QUESTION_API_URL = os.getenv("QUESTION_API_URL", "http://localhost:4003")
ADMIN_API_URL    = os.getenv("ADMIN_API_URL",    "http://localhost:4001")
ADMIN_EMAIL      = os.getenv("ADMIN_EMAIL",      "admin@quizhub.com")
ADMIN_PASSWORD   = os.getenv("ADMIN_PASSWORD",   "Admin@123")

# Pinecone
PINECONE_INDEX   = os.getenv("PINECONE_INDEX",   "quizhub-questions")
PINECONE_CLOUD   = os.getenv("PINECONE_CLOUD",   "aws")
PINECONE_REGION  = os.getenv("PINECONE_REGION",  "us-east-1")

# Embedding model (1536-dim)
EMBED_MODEL      = "text-embedding-3-small"
EMBED_DIM        = 1536

# Similarity threshold — cosine score above this means "already exists"
SIMILARITY_THRESHOLD = 0.92

# Cron: every 1 minute
CRON_INTERVAL_MINUTES = 1

# How many subtopics to pick per run
SUBTOPICS_PER_RUN = 1
