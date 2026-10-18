import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY      = os.getenv("OPENAI_API_KEY")
PINECONE_API_KEY    = os.getenv("PINECONE_API_KEY")

# Service URLs
TOPIC_API_URL       = os.getenv("TOPIC_API_URL",    "http://localhost:4002")
POST_API_URL        = os.getenv("POST_API_URL",     "http://localhost:4004")
AUTH_API_URL        = os.getenv("AUTH_API_URL",     "http://localhost:4001")
FILTER_API_URL      = os.getenv("FILTER_API_URL",   "http://localhost:5051")

# Approval email — sent after each generated post (leave APPROVAL_EMAIL_TO empty to disable)
APPROVAL_EMAIL_TO   = os.getenv("APPROVAL_EMAIL_TO", "")
# The email's "Approve post" button opens <ADMIN_PANEL_URL>/approve/<post id>, prefilled with ADMIN_EMAIL
ADMIN_PANEL_URL     = os.getenv("ADMIN_PANEL_URL",  "https://admin.meenzo.com")
MAIL_USER           = os.getenv("MAIL_USER",        "info@meenzo.com")
MAIL_PASSWORD       = os.getenv("MAIL_PASSWORD")
SMTP_HOST           = os.getenv("SMTP_HOST",        "smtp.hostinger.com")
SMTP_PORT           = int(os.getenv("SMTP_PORT",    "465"))

# Admin credentials
ADMIN_EMAIL         = os.getenv("ADMIN_EMAIL",      "admin@meenzo.com")
ADMIN_PASSWORD      = os.getenv("ADMIN_PASSWORD",   "Admin@1234")

# Pinecone
PINECONE_INDEX      = os.getenv("PINECONE_INDEX",   "meenzo-posts")
PINECONE_CLOUD      = os.getenv("PINECONE_CLOUD",   "aws")
PINECONE_REGION     = os.getenv("PINECONE_REGION",  "us-east-1")

# OpenAI models
CHAT_MODEL          = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
# Tried in order when CHAT_MODEL is rate-limited
CHAT_FALLBACK_MODELS = [m.strip() for m in os.getenv(
    "OPENAI_CHAT_FALLBACK_MODELS", "gpt-4.1-mini").split(",") if m.strip()]
# Last-resort image models (after OpenArt and Kie.ai), tried in order
IMAGE_MODELS        = [m.strip() for m in os.getenv("OPENAI_IMAGE_MODELS", "gpt-image-1").split(",") if m.strip()]
IMAGE_ENABLED       = os.getenv("IMAGE_GENERATION_ENABLED", "true").lower() == "true"

# OpenArt CLI (tried first when the binary and a signed-in ~/.openart are present)
OPENART_ENABLED       = os.getenv("OPENART_ENABLED", "true").lower() == "true"
OPENART_IMAGE_MODEL   = os.getenv("OPENART_IMAGE_MODEL", "nano-banana-2")
OPENART_TIMEOUT       = int(os.getenv("OPENART_TIMEOUT_SECONDS", "300"))

# Kie.ai image API (tried after OpenArt; OpenAI image models are the last fallback)
KIE_API_KEY         = os.getenv("KIE_API_KEY")
KIE_API_URL         = os.getenv("KIE_API_URL",      "https://api.kie.ai")
KIE_IMAGE_MODEL     = os.getenv("KIE_IMAGE_MODEL",  "google/nano-banana")
KIE_TIMEOUT_SECONDS = int(os.getenv("KIE_TIMEOUT_SECONDS", "180"))

# Embedding model (1536-dim, matches the Pinecone index)
EMBED_MODEL         = "text-embedding-3-small"
EMBED_DIM           = 1536

# Duplicate threshold — cosine similarity above this = already exists
SIMILARITY_THRESHOLD = 0.90

# 1 post per run × 2 runs = 2 posts per day
POSTS_PER_RUN       = int(os.getenv("POSTS_PER_RUN", "1"))

# Schedule (IST → UTC, IST = UTC+5:30):
#   08:00 IST = 02:30 UTC  (morning)
#   19:00 IST = 13:30 UTC  (evening)
CRON_SCHEDULE_UTC = [
    (2,  30),   # 08:00 IST — morning
    (13, 30),   # 19:00 IST — evening
]
