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
QUIZ_API_URL        = os.getenv("QUIZ_API_URL",     "http://localhost:4005")
QUESTION_API_URL    = os.getenv("QUESTION_API_URL", "http://localhost:4003")

# ── Daily games ───────────────────────────────────────────────────────────────
# Every day: one game per subtopic for topics in GAMES_PER_SUBTOPIC_TOPICS, and one
# game covering all subtopics for every other topic. Open GAME_START → GAME_END (IST).
DAILY_GAMES_ENABLED        = os.getenv("DAILY_GAMES_ENABLED", "true").lower() == "true"
GAMES_PER_SUBTOPIC_TOPICS  = [t.strip().lower() for t in os.getenv("GAMES_PER_SUBTOPIC_TOPICS", "engineering").split(",") if t.strip()]
GAME_QUESTIONS             = int(os.getenv("GAME_QUESTIONS", "20"))
# If a category has fewer than GAME_QUESTIONS questions, run a shorter game if at least this many exist
GAME_MIN_QUESTIONS         = int(os.getenv("GAME_MIN_QUESTIONS", "10"))
GAME_START_IST             = os.getenv("GAME_START_IST", "00:00")
GAME_END_IST               = os.getenv("GAME_END_IST",   "23:59")
# Games for the day are prepared at this time (IST), before they open
# Comma-separated IST times. 23:00 prepares the next day's games before they open at
# midnight; 00:05 is a safety run that creates anything missed (never duplicates).
GAME_PREPARE_IST           = [t.strip() for t in os.getenv("GAME_PREPARE_IST", "23:00,00:05").split(",") if t.strip()]

# Approval email — sent after each generated post (leave APPROVAL_EMAIL_TO empty to disable)
APPROVAL_EMAIL_TO   = os.getenv("APPROVAL_EMAIL_TO", "")
# The email's "Approve post" button opens <ADMIN_PANEL_URL>/approve/<post id>, prefilled with APPROVER_EMAIL
# (an admin account; separate from ADMIN_EMAIL, which the agents use to log in)
ADMIN_PANEL_URL     = os.getenv("ADMIN_PANEL_URL",  "https://admin.meenzo.com")
APPROVER_EMAIL      = os.getenv("APPROVER_EMAIL") or APPROVAL_EMAIL_TO
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
# gpt-4.1-mini writes noticeably more natural, varied prose than gpt-4o-mini for posts
CHAT_MODEL          = os.getenv("OPENAI_CHAT_MODEL", "gpt-4.1-mini")
# Independent fact-check of every post's specific claims. gpt-4.1 caught planted errors that
# gpt-4.1-mini missed (e.g. "over 1,300 articles in the original Constitution").
FACT_CHECK_MODEL    = os.getenv("OPENAI_FACT_CHECK_MODEL", "gpt-4.1")
# Tried in order when CHAT_MODEL is rate-limited
CHAT_FALLBACK_MODELS = [m.strip() for m in os.getenv(
    "OPENAI_CHAT_FALLBACK_MODELS", "gpt-4o-mini").split(",") if m.strip()]
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

# 2 posts per run × 4 runs = up to 8 posts per day (each waits for approval)
POSTS_PER_RUN       = int(os.getenv("POSTS_PER_RUN", "2"))

# ── Meme posts (meme_creator.py) ──────────────────────────────────────────────
# Funny educational memes, each in Hindi or English; each waits for approval like any post.
MEMES_ENABLED       = os.getenv("MEMES_ENABLED", "true").lower() == "true"
MEMES_PER_RUN       = int(os.getenv("MEMES_PER_RUN", "1"))
# Humour needs the stronger model; at a couple of memes a day the extra cost is small
MEME_CHAT_MODEL     = os.getenv("MEME_CHAT_MODEL", "gpt-4.1")
# Jokes brainstormed per subject (the editor keeps the best), and brainstorm rounds before giving up
MEME_CANDIDATES     = int(os.getenv("MEME_CANDIDATES", "5"))
MEME_ROUNDS         = int(os.getenv("MEME_ROUNDS", "2"))
# Comma-separated IST times — 3 memes a day: morning, lunch break and evening, when students scroll
MEME_SCHEDULE_IST   = [t.strip() for t in os.getenv("MEME_SCHEDULE_IST", "10:00,14:00,21:30").split(",") if t.strip()]
# Share of memes written in Hindi; the rest are in English
MEME_HINDI_SHARE    = float(os.getenv("MEME_HINDI_SHARE", "0.5"))

# ── Government-jobs agent (jobs_agent.py) ─────────────────────────────────────
# New central/state recruitment notifications from news headlines → a job post (waits for approval)
# → once approved, a daily practice quiz for that exam: same title, open 24 h, new questions each day.
JOBS_ENABLED           = os.getenv("JOBS_ENABLED", "true").lower() == "true"
JOBS_SCHEDULE_IST      = [t.strip() for t in os.getenv("JOBS_SCHEDULE_IST", "09:00,18:00").split(",") if t.strip()]
JOBS_PER_RUN           = int(os.getenv("JOBS_PER_RUN", "2"))
JOBS_MODEL             = os.getenv("JOBS_MODEL", "gpt-4.1")   # extraction accuracy matters most here
# Reviews the state-language half of bilingual questions; gpt-4.1's Tamil used wrong exam terms
# ("கட்டுரை", an essay, for a constitutional Article) where this model used the official ones
JOBS_TRANSLATE_MODEL   = os.getenv("JOBS_TRANSLATE_MODEL", "gpt-5.6-sol")
JOBS_TOPIC             = os.getenv("JOBS_TOPIC", "Government Jobs")
# How often to check whether an approved job post needs its first / next 24-hour quiz
JOB_SERIES_CHECK_MINUTES = int(os.getenv("JOB_SERIES_CHECK_MINUTES", "30"))
JOB_SERIES_DAYS        = int(os.getenv("JOB_SERIES_DAYS", "14"))
JOB_QUIZ_QUESTIONS     = int(os.getenv("JOB_QUIZ_QUESTIONS", "15"))
JOB_QUIZ_MIN_QUESTIONS = int(os.getenv("JOB_QUIZ_MIN_QUESTIONS", "10"))

# Schedule (IST → UTC, IST = UTC+5:30), spread through the day:
CRON_SCHEDULE_UTC = [
    (2,  30),   # 08:00 IST — morning
    (6,  30),   # 12:00 IST — noon
    (10, 30),   # 16:00 IST — afternoon
    (14, 30),   # 20:00 IST — evening
]
