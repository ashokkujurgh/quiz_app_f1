"""
Post-creator entry point.
- Scheduler: runs agent at 07:00 and 19:00 IST (01:30 and 13:30 UTC) every day.
- HTTP server: POST /trigger  — manually trigger a run
               GET  /health   — liveness check
Run: python main.py
"""
import logging
import os
import signal
import sys
import threading
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from flask import Flask, jsonify
from config import CRON_SCHEDULE_UTC
from agent import run_agent

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Flask app ──────────────────────────────────────────────────────────────────

app = Flask(__name__)

_agent_lock = threading.Lock()


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/trigger")
def trigger():
    if not _agent_lock.acquire(blocking=False):
        return jsonify({"status": "busy", "message": "Agent is already running"}), 409
    def _run():
        try:
            run_agent()
        finally:
            _agent_lock.release()
    threading.Thread(target=_run, daemon=True).start()
    return jsonify({"status": "started", "message": "Post-creator agent triggered"}), 202


# ── Scheduler + main ───────────────────────────────────────────────────────────

def main() -> None:
    scheduler = BackgroundScheduler(timezone="UTC")

    for hour, minute in CRON_SCHEDULE_UTC:
        ist_h = (hour * 60 + minute + 330) // 60 % 24
        ist_m = (minute + 30) % 60
        scheduler.add_job(
            run_agent,
            trigger=CronTrigger(hour=hour, minute=minute, timezone="UTC"),
            id=f"post_creator_{hour:02d}{minute:02d}",
            name=f"Post creator @ {hour:02d}:{minute:02d} UTC ({ist_h:02d}:{ist_m:02d} IST)",
            replace_existing=True,
            max_instances=1,
        )
        logger.info(
            "Scheduled post-creator @ %02d:%02d UTC  (%02d:%02d IST)",
            hour, minute, ist_h, ist_m,
        )

    def _shutdown(signum, frame):
        logger.info("Shutting down…")
        scheduler.shutdown(wait=False)
        sys.exit(0)

    signal.signal(signal.SIGINT,  _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    scheduler.start()
    logger.info("Scheduler started.")

    # Run once on startup
    threading.Thread(target=run_agent, daemon=True).start()

    port = int(os.getenv("PORT", 5050))
    logger.info("HTTP server listening on port %d", port)
    app.run(host="0.0.0.0", port=port, use_reloader=False)


if __name__ == "__main__":
    main()
