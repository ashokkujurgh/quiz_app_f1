"""
Entry point — schedules the agent job every CRON_INTERVAL_MINUTES (default 14) via APScheduler.
Run: python main.py

Set AGENT_ENABLED=false to disable without removing the service.
"""
import logging
import os
import signal
import sys
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from config import CRON_INTERVAL_MINUTES, CA_RUN_IST
from agent import run_agent
from seed_topics import seed_topics
from current_affairs import run_current_affairs

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── DISABLED ──────────────────────────────────────────────────────────────────
AGENT_ENABLED = os.getenv("AGENT_ENABLED", "false").lower() == "true"


def main() -> None:
    if not AGENT_ENABLED:
        logger.info("Quiz generator agent is DISABLED (AGENT_ENABLED=false). Exiting.")
        return

    scheduler = BlockingScheduler(timezone="UTC")
    scheduler.add_job(
        run_agent,
        trigger=IntervalTrigger(minutes=CRON_INTERVAL_MINUTES),
        id="quiz_agent",
        name="QuizHub question generator",
        replace_existing=True,
        max_instances=1,
    )

    # Daily current-affairs questions (CA_RUN_IST, IST → UTC), saved pending approval
    ca_h, ca_m = (int(x) for x in CA_RUN_IST.split(":"))
    utc_h, utc_m = divmod((ca_h * 60 + ca_m - 330) % (24 * 60), 60)
    scheduler.add_job(
        run_current_affairs,
        trigger=CronTrigger(hour=utc_h, minute=utc_m, timezone="UTC"),
        id="current_affairs",
        name=f"Current affairs @ {CA_RUN_IST} IST",
        replace_existing=True,
        max_instances=1,
    )
    logger.info("Scheduled current affairs @ %02d:%02d UTC (%s IST)", utc_h, utc_m, CA_RUN_IST)

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
