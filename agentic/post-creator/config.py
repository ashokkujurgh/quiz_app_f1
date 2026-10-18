import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY      = os.getenv("GEMINI_API_KEY")
PINECONE_API_KEY    = os.getenv("PINECONE_API_KEY")

# Service URLs
TOPIC_API_URL       = os.getenv("TOPIC_API_URL",    "http://localhost:4002")
POST_API_URL        = os.getenv("POST_API_URL",     "http://localhost:4004")
AUTH_API_URL        = os.getenv("AUTH_API_URL",     "http://localhost:4001")
FILTER_API_URL      = os.getenv("FILTER_API_URL",   "http://localhost:5051")

# Admin credentials
ADMIN_EMAIL         = os.getenv("ADMIN_EMAIL",      "admin@meenzo.com")
ADMIN_PASSWORD      = os.getenv("ADMIN_PASSWORD",   "Admin@1234")

# Pinecone
PINECONE_INDEX      = os.getenv("PINECONE_INDEX",   "meenzo-posts")
PINECONE_CLOUD      = os.getenv("PINECONE_CLOUD",   "aws")
PINECONE_REGION     = os.getenv("PINECONE_REGION",  "us-east-1")

# Gemini models
CHAT_MODEL          = os.getenv("GEMINI_CHAT_MODEL", "gemini-3.8-flash")
# Tried in order when CHAT_MODEL is out of quota (free tier limits each model separately)
CHAT_FALLBACK_MODELS = [m.strip() for m in os.getenv(
    "GEMINI_CHAT_FALLBACK_MODELS", "gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash").split(",") if m.strip()]
# Image models, tried in order (needs a billed Gemini API project — free tier has no image quota)
IMAGE_MODELS        = os.getenv("GEMINI_IMAGE_MODELS", "gemini-3.1-flash-image,gemini-2.5-flash-image").split(",")
IMAGE_ENABLED       = os.getenv("IMAGE_GENERATION_ENABLED", "true").lower() == "true"

# OpenArt CLI (tried first when the binary and a signed-in ~/.openart are present)
OPENART_ENABLED       = os.getenv("OPENART_ENABLED", "true").lower() == "true"
OPENART_IMAGE_MODEL   = os.getenv("OPENART_IMAGE_MODEL", "nano-banana-2")
OPENART_TIMEOUT       = int(os.getenv("OPENART_TIMEOUT_SECONDS", "300"))

# Kie.ai image API (tried first when a key is set; Gemini image models are the fallback)
KIE_API_KEY         = os.getenv("KIE_API_KEY")
KIE_API_URL         = os.getenv("KIE_API_URL",      "https://api.kie.ai")
KIE_IMAGE_MODEL     = os.getenv("KIE_IMAGE_MODEL",  "google/nano-banana")
KIE_TIMEOUT_SECONDS = int(os.getenv("KIE_TIMEOUT_SECONDS", "180"))

# Embedding model (truncated to 1536-dim to match the Pinecone index)
EMBED_MODEL         = "gemini-embedding-001"
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
