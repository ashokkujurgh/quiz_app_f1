"""
Post-creator entry point.
- Scheduler: runs agent at 07:00 and 19:00 IST (01:30 and 13:30 UTC) every day.
- Daily games: prepared at 23:00 IST (safety run 00:05), open all day 00:00–23:59 IST.
- HTTP server: POST /trigger        — manually trigger a post run
                                 (optional body {"subtopics": [...]}: one post per named subject)
               POST /trigger-games  — manually create today's (or tomorrow's) games
               POST /trigger-memes  — manually create meme post(s)
                                 (optional body {"subtopics": [...], "count": n})
               POST /trigger-jobs   — manually look for new government job notifications
               GET  /health         — liveness check
Run: python main.py
"""
import logging
import os
import signal
import sys
import threading
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from flask import Flask, jsonify, request
from apscheduler.triggers.interval import IntervalTrigger
from config import (CRON_SCHEDULE_UTC, DAILY_GAMES_ENABLED, GAME_PREPARE_IST, MEMES_ENABLED, MEME_SCHEDULE_IST,
                    HINDI_POSTS_ENABLED, HINDI_POST_SCHEDULE_IST,
                    JOBS_ENABLED, JOBS_SCHEDULE_IST, JOB_SERIES_CHECK_MINUTES)
from agent import run_agent
from daily_games import run_daily_games
from meme_creator import run_memes
from jobs_agent import run_jobs, run_series_check

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
    # Optional JSON body {"subtopics": ["Rajasthan GK", …]}: one post for each named subject;
    # {"language": "hi"} writes the Hindi post instead
    body = request.get_json(silent=True) or {}
    only = body.get("subtopics") or None
    language = "hi" if body.get("language") == "hi" else "en"
    if not _agent_lock.acquire(blocking=False):
        return jsonify({"status": "busy", "message": "Agent is already running"}), 409
    def _run():
        try:
            run_agent(only, language)
        finally:
            _agent_lock.release()
    threading.Thread(target=_run, daemon=True).start()
    return jsonify({"status": "started", "message": "Post-creator agent triggered"}), 202


_games_lock = threading.Lock()


@app.post("/trigger-games")
def trigger_games():
    if not _games_lock.acquire(blocking=False):
        return jsonify({"status": "busy", "message": "Daily games are already being created"}), 409
    def _run():
        try:
            run_daily_games()
        finally:
            _games_lock.release()
    threading.Thread(target=_run, daemon=True).start()
    return jsonify({"status": "started", "message": "Daily games creation triggered"}), 202


_memes_lock = threading.Lock()


@app.post("/trigger-memes")
def trigger_memes():
    body = request.get_json(silent=True) or {}
    only, count = body.get("subtopics") or None, body.get("count")
    if not _memes_lock.acquire(blocking=False):
        return jsonify({"status": "busy", "message": "Meme agent is already running"}), 409
    def _run():
        try:
            run_memes(only, int(count) if count else None)
        finally:
            _memes_lock.release()
    threading.Thread(target=_run, daemon=True).start()
    return jsonify({"status": "started", "message": "Meme agent triggered"}), 202


def _scheduled_memes() -> None:
    # Skip if a manual /trigger-memes run is still going
    if not _memes_lock.acquire(blocking=False):
        logger.info("Meme agent already running — skipping scheduled run.")
        return
    try:
        run_memes()
    finally:
        _memes_lock.release()


_jobs_lock = threading.Lock()


def _jobs_run(find_new: bool) -> None:
    # One lock for both jobs tasks, so two runs never create the same day's quiz
    if not _jobs_lock.acquire(blocking=False):
        logger.info("Jobs agent already running — skipping.")
        return
    try:
        if find_new:
            run_jobs()
        run_series_check()
    finally:
        _jobs_lock.release()


@app.post("/trigger-jobs")
def trigger_jobs():
    if _jobs_lock.locked():
        return jsonify({"status": "busy", "message": "Jobs agent is already running"}), 409
    threading.Thread(target=_jobs_run, args=(True,), daemon=True).start()
    return jsonify({"status": "started", "message": "Jobs agent triggered"}), 202


def _scheduled_hindi_post() -> None:
    # Shares the post-run lock with /trigger, so it never overlaps a manual run
    if not _agent_lock.acquire(blocking=False):
        logger.info("Post agent already running — skipping the Hindi post run.")
        return
    try:
        run_agent(language="hi")
    finally:
        _agent_lock.release()


def _ist_to_utc(ist_time: str) -> tuple[int, int]:
    ist_h, ist_m = (int(x) for x in ist_time.split(":"))
    return divmod((ist_h * 60 + ist_m - 330) % (24 * 60), 60)


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

    if DAILY_GAMES_ENABLED:
        # Each GAME_PREPARE_IST time (e.g. "23:00") → UTC cron job. run_daily_games()
        # picks today or tomorrow itself and skips categories that already have a game.
        for ist_time in GAME_PREPARE_IST:
            ist_h, ist_m = (int(x) for x in ist_time.split(":"))
            total = (ist_h * 60 + ist_m - 330) % (24 * 60)
            utc_h, utc_m = divmod(total, 60)
            scheduler.add_job(
                run_daily_games,
                trigger=CronTrigger(hour=utc_h, minute=utc_m, timezone="UTC"),
                id=f"daily_games_{ist_h:02d}{ist_m:02d}",
                name=f"Daily games @ {utc_h:02d}:{utc_m:02d} UTC ({ist_time} IST)",
                replace_existing=True,
                max_instances=1,
            )
            logger.info("Scheduled daily games @ %02d:%02d UTC  (%s IST)", utc_h, utc_m, ist_time)

    if HINDI_POSTS_ENABLED:
        for ist_time in HINDI_POST_SCHEDULE_IST:
            utc_h, utc_m = _ist_to_utc(ist_time)
            scheduler.add_job(
                _scheduled_hindi_post,
                trigger=CronTrigger(hour=utc_h, minute=utc_m, timezone="UTC"),
                id=f"hindi_post_{utc_h:02d}{utc_m:02d}",
                name=f"Hindi post @ {utc_h:02d}:{utc_m:02d} UTC ({ist_time} IST)",
                replace_existing=True,
                max_instances=1,
            )
            logger.info("Scheduled Hindi post @ %02d:%02d UTC  (%s IST)", utc_h, utc_m, ist_time)

    if MEMES_ENABLED:
        for ist_time in MEME_SCHEDULE_IST:
            utc_h, utc_m = _ist_to_utc(ist_time)
            scheduler.add_job(
                _scheduled_memes,
                trigger=CronTrigger(hour=utc_h, minute=utc_m, timezone="UTC"),
                id=f"memes_{utc_h:02d}{utc_m:02d}",
                name=f"Meme posts @ {utc_h:02d}:{utc_m:02d} UTC ({ist_time} IST)",
                replace_existing=True,
                max_instances=1,
            )
            logger.info("Scheduled meme posts @ %02d:%02d UTC  (%s IST)", utc_h, utc_m, ist_time)

    if JOBS_ENABLED:
        for ist_time in JOBS_SCHEDULE_IST:
            utc_h, utc_m = _ist_to_utc(ist_time)
            scheduler.add_job(
                _jobs_run, args=(True,),
                trigger=CronTrigger(hour=utc_h, minute=utc_m, timezone="UTC"),
                id=f"jobs_{utc_h:02d}{utc_m:02d}",
                name=f"Government jobs @ {utc_h:02d}:{utc_m:02d} UTC ({ist_time} IST)",
                replace_existing=True,
                max_instances=1,
            )
            logger.info("Scheduled government jobs @ %02d:%02d UTC  (%s IST)", utc_h, utc_m, ist_time)
        # Next 24-hour practice quiz for each approved job post (and the first one after approval)
        scheduler.add_job(
            _jobs_run, args=(False,),
            trigger=IntervalTrigger(minutes=JOB_SERIES_CHECK_MINUTES),
            id="job_series_check",
            name=f"Job quiz series check every {JOB_SERIES_CHECK_MINUTES} min",
            replace_existing=True,
            max_instances=1,
        )
        logger.info("Scheduled job quiz-series check every %d min", JOB_SERIES_CHECK_MINUTES)

    def _shutdown(signum, frame):
        logger.info("Shutting down…")
        scheduler.shutdown(wait=False)
        sys.exit(0)

    signal.signal(signal.SIGINT,  _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    scheduler.start()
    logger.info("Scheduler started.")

    # No run on startup: posts are created only on schedule (or via POST /trigger),
    # so redeploys don't generate extra posts.

    port = int(os.getenv("PORT", 5050))
    logger.info("HTTP server listening on port %d", port)
    app.run(host="0.0.0.0", port=port, use_reloader=False)


if __name__ == "__main__":
    main()
