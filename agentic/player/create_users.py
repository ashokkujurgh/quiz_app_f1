"""
Standalone script — creates all 15 AI bot player accounts.
  • 10 Indian names
  •  5 Foreign names

Usage:
    python create_users.py
    AUTH_SERVICE_URL=http://localhost:7202 python create_users.py

Safe to run multiple times (already-existing accounts are skipped).
"""
import logging
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import requests
from config import AUTH_SERVICE_URL, PLAYER_USERS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


def create_user(user: dict) -> dict:
    """Register + login one player. Returns status info."""
    result = {"name": user["name"], "email": user["email"], "status": "", "token": None}

    # --- Register ---
    try:
        r = requests.post(
            f"{AUTH_SERVICE_URL}/api/auth/register",
            json={"name": user["name"], "email": user["email"], "password": user["password"]},
            timeout=10,
        )
        if r.status_code in (200, 201):
            result["status"] = "CREATED"
        elif r.status_code == 409:
            result["status"] = "EXISTS"
        else:
            result["status"] = f"REG_FAIL({r.status_code})"
            return result
    except Exception as exc:
        result["status"] = f"ERROR({exc})"
        return result

    # --- Login to confirm credentials work ---
    try:
        r = requests.post(
            f"{AUTH_SERVICE_URL}/api/auth/login",
            json={"email": user["email"], "password": user["password"]},
            timeout=10,
        )
        if r.ok:
            result["token"] = r.json().get("accessToken", "")[:20] + "…"
        else:
            result["status"] += " LOGIN_FAIL"
    except Exception as exc:
        result["status"] += f" LOGIN_ERR({exc})"

    return result


def main() -> None:
    logger.info("Auth service: %s", AUTH_SERVICE_URL)
    logger.info("")
    logger.info("%-4s  %-15s  %-30s  %-12s  %s", "#", "Name", "Email", "Status", "Token (preview)")
    logger.info("-" * 90)

    all_ok = True
    for i, user in enumerate(PLAYER_USERS, 1):
        res = create_user(user)
        token_preview = res["token"] or "—"
        logger.info(
            "%-4s  %-15s  %-30s  %-12s  %s",
            i, res["name"], res["email"], res["status"], token_preview,
        )
        if "FAIL" in res["status"] or "ERROR" in res["status"]:
            all_ok = False

    logger.info("-" * 90)
    if all_ok:
        logger.info("✓ All 15 AI players are ready  (10 Indian + 5 Foreign).")
    else:
        logger.info("✗ Some players failed — check the auth service is running.")
        sys.exit(1)


if __name__ == "__main__":
    main()
