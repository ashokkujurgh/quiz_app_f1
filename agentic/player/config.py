import os
from dotenv import load_dotenv

load_dotenv()

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:7202")
QUIZ_SERVICE_URL = os.getenv("QUIZ_SERVICE_URL", "http://localhost:7208")
QUIZ_SOCKET_URL  = os.getenv("QUIZ_SOCKET_URL",  "http://localhost:7208")
QUIZ_SOCKET_PATH = os.getenv("QUIZ_SOCKET_PATH", "/quiz.io/")

# Admin credentials — used only to get the admin user ID for quiz filtering
ADMIN_EMAIL    = os.getenv("ADMIN_EMAIL",    "admin@quizhub.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin@123")
ADMIN_API_URL  = os.getenv("ADMIN_API_URL",  "http://localhost:7202")

# 15 AI bot players — 10 Indian names + 5 foreign names
PLAYER_USERS = [
    # ── Indian players (10) ───────────────────────────────────────────────
    {"name": "Aarav Sharma",    "email": "aarav.sharma@quizhub.com",    "password": "Player@123"},
    {"name": "Priya Patel",     "email": "priya.patel@quizhub.com",     "password": "Player@123"},
    {"name": "Rohan Verma",     "email": "rohan.verma@quizhub.com",     "password": "Player@123"},
    {"name": "Sneha Iyer",      "email": "sneha.iyer@quizhub.com",      "password": "Player@123"},
    {"name": "Karan Mehta",     "email": "karan.mehta@quizhub.com",     "password": "Player@123"},
    {"name": "Ananya Reddy",    "email": "ananya.reddy@quizhub.com",    "password": "Player@123"},
    {"name": "Vikram Singh",    "email": "vikram.singh@quizhub.com",    "password": "Player@123"},
    {"name": "Divya Nair",      "email": "divya.nair@quizhub.com",      "password": "Player@123"},
    {"name": "Arjun Gupta",     "email": "arjun.gupta@quizhub.com",     "password": "Player@123"},
    {"name": "Meera Joshi",     "email": "meera.joshi@quizhub.com",     "password": "Player@123"},
    # ── Foreign players (5) ───────────────────────────────────────────────
    {"name": "Ethan Clarke",    "email": "ethan.clarke@quizhub.com",    "password": "Player@123"},
    {"name": "Sofia Andersen",  "email": "sofia.andersen@quizhub.com",  "password": "Player@123"},
    {"name": "Lucas Fernandez", "email": "lucas.fernandez@quizhub.com", "password": "Player@123"},
    {"name": "Emma Müller",     "email": "emma.muller@quizhub.com",     "password": "Player@123"},
    {"name": "Noah Williams",   "email": "noah.williams@quizhub.com",   "password": "Player@123"},
]

# Random player count per quiz — varies so each game has a different crowd
# Some quizzes: 5 players, some: 7, some: 10, etc.
MIN_PLAYERS_PER_QUIZ = 5
MAX_PLAYERS_PER_QUIZ = 12

# Simulated "thinking" delay before submitting an answer (seconds)
ANSWER_DELAY_MIN = 1
ANSWER_DELAY_MAX = 8

# How often to poll for new active quizzes (seconds)
POLL_INTERVAL = 5
