"""
delete_users.py — Remove all 15 AI bot users from MongoDB directly.

Usage (from project root or agentic/player/):
  python agentic/player/delete_users.py

Requires:
  pip install pymongo python-dotenv
"""

import os
import sys
from dotenv import load_dotenv

# Load .env from auth-service so we get the same DB_URL
_here = os.path.dirname(os.path.abspath(__file__))
_env  = os.path.join(_here, '..', '..', 'backend', 'auth-service', '.env')
load_dotenv(_env)

MONGO_URI = os.getenv('DB_URL')
if not MONGO_URI:
    sys.exit('❌  DB_URL not found. Checked: ' + _env)

from pymongo import MongoClient   # noqa: E402  (import after env load)

BOT_EMAILS = [
    "aarav.sharma@quizhub.com",
    "priya.patel@quizhub.com",
    "rohan.verma@quizhub.com",
    "sneha.iyer@quizhub.com",
    "karan.mehta@quizhub.com",
    "ananya.reddy@quizhub.com",
    "vikram.singh@quizhub.com",
    "divya.nair@quizhub.com",
    "arjun.gupta@quizhub.com",
    "meera.joshi@quizhub.com",
    "ethan.clarke@quizhub.com",
    "sofia.andersen@quizhub.com",
    "lucas.fernandez@quizhub.com",
    "emma.muller@quizhub.com",
    "noah.williams@quizhub.com",
]

def main():
    print(f"Connecting to MongoDB…")
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000)
    db     = client.get_default_database()

    users_col = db['users']

    result = users_col.delete_many({'email': {'$in': BOT_EMAILS}})
    print(f"✅  Deleted {result.deleted_count} bot user(s) from the 'users' collection.")

    if result.deleted_count < len(BOT_EMAILS):
        remaining = len(BOT_EMAILS) - result.deleted_count
        print(f"ℹ️   {remaining} user(s) were not found (may never have been created).")

    client.close()

if __name__ == '__main__':
    main()
