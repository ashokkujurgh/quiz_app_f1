import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY      = os.getenv("OPENAI_API_KEY")
DALLE_API_KEY       = os.getenv("OPENAI_DALLE_E_API_KEY") or os.getenv("OPENAI_API_KEY")
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

# Embedding model
EMBED_MODEL         = "text-embedding-3-small"
EMBED_DIM           = 1536

# Duplicate threshold — cosine similarity above this = already exists
SIMILARITY_THRESHOLD = 0.90

# 2 posts per run × 3 runs = 6 posts per day
POSTS_PER_RUN       = 2

# Schedule (IST → UTC, IST = UTC+5:30):
#   08:00 IST = 02:30 UTC  (morning)
#   13:00 IST = 07:30 UTC  (afternoon)
#   19:00 IST = 13:30 UTC  (evening)
CRON_SCHEDULE_UTC = [
    (2,  30),   # 08:00 IST — morning
    (7,  30),   # 13:00 IST — afternoon
    (13, 30),   # 19:00 IST — evening
]
