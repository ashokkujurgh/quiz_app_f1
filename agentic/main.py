"""
Entry point — schedules the agent job every 20 minutes via APScheduler.
Run: python main.py
"""
import logging
import signal
import sys
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger
from config import CRON_INTERVAL_MINUTES
from agent import run_agent
from seed_topics import seed_topics

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


def main() -> None:
    scheduler = BlockingScheduler(timezone="UTC")
    scheduler.add_job(
        run_agent,
        trigger=IntervalTrigger(minutes=CRON_INTERVAL_MINUTES),
        id="quiz_agent",
        name="QuizHub question generator",
        replace_existing=True,
        max_instances=1,
    )

    def _shutdown(signum, frame):
        logger.info("Shutting down scheduler…")
        scheduler.shutdown(wait=False)
        sys.exit(0)

    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    logger.info(
        "Scheduler started — running every %d minutes. Press Ctrl+C to stop.",
        CRON_INTERVAL_MINUTES,
    )
    seed_topics()
    # Run once immediately on startup, then on schedule
    run_agent()
    scheduler.start()


if __name__ == "__main__":
    main()
