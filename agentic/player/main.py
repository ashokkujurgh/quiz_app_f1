"""
Player Agent Service — entry point.

Startup sequence:
  1. Create / verify all 10 bot player accounts (register + login).
  2. Fetch admin user ID (used to filter admin-only quizzes).
  3. Start QuizWatcher loop — every 5s, check for new active admin quizzes
     and launch a random subset of players (5–8) to play each one.
"""
import logging
import signal
import sys

from auth import create_all_players, get_admin_user_id
from watcher import QuizWatcher

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


def main() -> None:
    logger.info("╔══════════════════════════════════════════════════════╗")
    logger.info("║       QuizHub — Player Agent Service                 ║")
    logger.info("╚══════════════════════════════════════════════════════╝")

    # Step 1 — create all 10 bot players
    create_all_players()

    # Step 2 — get admin user ID to filter admin quizzes
    admin_id = get_admin_user_id()
    if admin_id:
        logger.info("Admin user ID resolved: %s", admin_id)
    else:
        logger.warning("Could not resolve admin ID — will watch ALL active quizzes.")

    # Step 3 — start watcher
    watcher = QuizWatcher(admin_user_id=admin_id)

    def _shutdown(signum, frame):
        logger.info("Shutting down player agent service.")
        sys.exit(0)

    signal.signal(signal.SIGINT,  _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    watcher.run_forever()


if __name__ == "__main__":
    main()
