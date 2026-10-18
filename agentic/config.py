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
# Namespace per database, so duplicate checks only see questions that exist in the current DB
PINECONE_NAMESPACE = os.getenv("PINECONE_NAMESPACE", "db_meenzo")

# Embedding model (1536-dim)
EMBED_MODEL      = "text-embedding-3-small"
EMBED_DIM        = 1536

# Similarity threshold — cosine score above this means "already exists"
SIMILARITY_THRESHOLD = 0.97

# Daily target: stop saving new questions once this many were saved today (IST)
QUESTIONS_PER_DAY = int(os.getenv("QUESTIONS_PER_DAY", "100"))

# Cron: every 14 minutes ≈ 103 runs/day, 1 saved question per run → spreads 100/day evenly
CRON_INTERVAL_MINUTES = int(os.getenv("CRON_INTERVAL_MINUTES", "14"))

# Questions to save per run, and how many subtopics to try (duplicates/failures move on to the next)
QUESTIONS_PER_RUN = int(os.getenv("QUESTIONS_PER_RUN", "1"))
SUBTOPICS_PER_RUN = 3

# ── Current affairs (official PIB releases → pending approval) ─────────────────
CA_TOPIC              = "Current Affairs"
CA_SUBTOPIC           = "Current Affairs"
CA_QUESTIONS_PER_DAY  = int(os.getenv("CA_QUESTIONS_PER_DAY", "10"))
CA_MODEL              = os.getenv("CA_MODEL", "gpt-4.1")   # writes + verifies; accuracy matters most here
CA_RUN_IST            = os.getenv("CA_RUN_IST", "18:00")   # after most of the day's releases
# true: questions that pass both automatic checks go live at once; false: saved inactive for manual approval
CA_AUTO_APPROVE       = os.getenv("CA_AUTO_APPROVE", "true").lower() == "true"
# Topics the regular generator must never write from memory (they have their own grounded pipeline)
EXCLUDED_TOPICS       = {CA_TOPIC.lower()}

# Approval reminder email (same Hostinger account as the rest of Meenzo)
APPROVAL_EMAIL_TO     = os.getenv("APPROVAL_EMAIL_TO", "")
MAIL_USER             = os.getenv("MAIL_USER", "info@meenzo.com")
MAIL_PASSWORD         = os.getenv("MAIL_PASSWORD")
SMTP_HOST             = os.getenv("SMTP_HOST", "smtp.hostinger.com")
SMTP_PORT             = int(os.getenv("SMTP_PORT", "465"))

# How many existing questions to pass as RAG context (more = less repetition)
RAG_CONTEXT_SIZE = 15
