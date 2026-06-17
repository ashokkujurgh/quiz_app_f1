"""
PlayerAgent — one bot player that plays a single quiz game via Socket.IO.

Lifecycle:
  1. Connects with the player's JWT token.
  2. Emits join_game.
  3. Listens for questions and submits random answers after a realistic delay.
  4. Supports both per_question and total_timer quiz modes.
  5. Sets _done event when game_over / disconnect is received.
"""
import logging
import random
import threading
import time
from typing import Callable

import socketio

from auth import get_token, refresh_token
from config import (
    QUIZ_SOCKET_URL,
    QUIZ_SOCKET_PATH,
    ANSWER_DELAY_MIN,
    ANSWER_DELAY_MAX,
)

logger = logging.getLogger(__name__)


class PlayerAgent:
    def __init__(
        self,
        user: dict,
        quiz_id: str,
        on_done: Callable[["PlayerAgent"], None] | None = None,
    ):
        self.user    = user
        self.quiz_id = quiz_id
        self.on_done = on_done
        self.sio     = socketio.Client(logger=False, engineio_logger=False)
        self._done   = threading.Event()
        self._register_handlers()

    # ── Socket handlers ────────────────────────────────────────────────────

    def _register_handlers(self) -> None:
        sio = self.sio

        @sio.event
        def connect():
            logger.info("[%s] connected → joining quiz %s", self.user["name"], self.quiz_id)
            sio.emit("join_game", {
                "quizId":   self.quiz_id,
                "userName": self.user["name"],
            })

        @sio.event
        def connect_error(data):
            logger.error("[%s] connect_error: %s", self.user["name"], data)
            self._finish()

        @sio.event
        def disconnect():
            logger.info("[%s] disconnected", self.user["name"])
            self._finish()

        @sio.on("players_list")
        def on_players_list(data):
            names = [p.get("userName") for p in data.get("players", [])]
            logger.info("[%s] room has %d players: %s", self.user["name"], len(names), names)

        @sio.on("player_joined")
        def on_player_joined(data):
            logger.debug("[%s] player joined: %s", self.user["name"], data.get("userName"))

        @sio.on("game_started")
        def on_game_started(data):
            mode = data.get("mode")
            logger.info("[%s] game_started (mode=%s)", self.user["name"], mode)
            if mode == "total_timer":
                questions = data.get("questions", [])
                duration  = data.get("durationSeconds", 60)
                self._answer_total_timer(questions, duration)

        @sio.on("question")
        def on_question(data):
            q_index    = data.get("questionIndex", 0)
            q_id       = data.get("questionId")
            options    = data.get("options", [])
            time_limit = int(data.get("timeLimit", 15))
            n_options  = max(len(options), 4)

            logger.info(
                "[%s] ← Q%d  (timeLimit=%ds, %d options)",
                self.user["name"], q_index + 1, time_limit, n_options,
            )
            max_wait = max(ANSWER_DELAY_MIN + 0.5, min(ANSWER_DELAY_MAX, time_limit - 2))
            self._schedule_answer(
                question_id=q_id,
                question_index=q_index,
                n_options=n_options,
                max_wait=max_wait,
            )

        @sio.on("question_ended")
        def on_question_ended(data):
            logger.debug(
                "[%s] question_ended Q%d correct=%s",
                self.user["name"],
                data.get("questionIndex", 0) + 1,
                data.get("correctAnswer"),
            )

        @sio.on("game_over")
        def on_game_over(data):
            logger.info("[%s] ★ game_over — quiz %s finished", self.user["name"], self.quiz_id)
            # Log this player's result from leaderboard
            lb = data.get("leaderboard", [])
            entry = next((e for e in lb if e.get("userName") == self.user["name"]), None)
            if entry:
                logger.info(
                    "[%s] result: rank=%s score=%s/%s (%.0f%%)",
                    self.user["name"],
                    entry.get("rank"), entry.get("score"), entry.get("total"),
                    entry.get("percentage", 0),
                )
            self._finish()

        @sio.on("game_error")
        def on_game_error(data):
            logger.error("[%s] game_error: %s", self.user["name"], data.get("message"))
            self._finish()

        @sio.on("quiz_activated")
        def on_quiz_activated(data):
            logger.debug("[%s] quiz_activated broadcast: %s", self.user["name"], data.get("title"))

    # ── Answer helpers ─────────────────────────────────────────────────────

    def _schedule_answer(
        self,
        question_id: str,
        question_index: int,
        n_options: int,
        max_wait: float,
    ) -> None:
        delay = random.uniform(ANSWER_DELAY_MIN, max_wait)

        def _submit():
            time.sleep(delay)
            if not self.sio.connected:
                return
            answer = random.randint(0, n_options - 1)
            self.sio.emit("submit_answer", {
                "quizId":        self.quiz_id,
                "questionId":    question_id,
                "questionIndex": question_index,
                "answer":        answer,
            })
            logger.info(
                "[%s] → answered Q%d with option %d  (delay=%.1fs)",
                self.user["name"], question_index + 1, answer, delay,
            )

        threading.Thread(target=_submit, daemon=True).start()

    def _answer_total_timer(self, questions: list[dict], duration: int) -> None:
        """Spread all answers randomly across 70% of the timer window."""
        if not questions:
            return

        def _submit_all():
            window = max(duration * 0.70, 5)
            for idx, q in enumerate(questions):
                delay = random.uniform(1, window / max(len(questions), 1))
                time.sleep(delay)
                if not self.sio.connected:
                    return
                n_opts = max(len(q.get("options", [])), 4)
                answer = random.randint(0, n_opts - 1)
                self.sio.emit("submit_answer", {
                    "quizId":        self.quiz_id,
                    "questionId":    q["questionId"],
                    "questionIndex": idx,
                    "answer":        answer,
                })
                logger.info(
                    "[%s] → total_timer Q%d option %d",
                    self.user["name"], idx + 1, answer,
                )

        threading.Thread(target=_submit_all, daemon=True).start()

    # ── Lifecycle ──────────────────────────────────────────────────────────

    def _finish(self) -> None:
        self._done.set()
        if self.on_done:
            self.on_done(self)

    def run(self) -> None:
        token = get_token(self.user["email"]) or refresh_token(self.user["email"])
        if not token:
            logger.error("[%s] no token — skipping", self.user["name"])
            return

        try:
            self.sio.connect(
                QUIZ_SOCKET_URL,
                socketio_path=QUIZ_SOCKET_PATH,
                auth={"token": token},
                transports=["websocket"],
                wait_timeout=10,
            )
            self._done.wait()
        except Exception as exc:
            logger.error("[%s] run error: %s", self.user["name"], exc)
        finally:
            try:
                if self.sio.connected:
                    self.sio.disconnect()
            except Exception:
                pass

    def start_thread(self) -> threading.Thread:
        t = threading.Thread(target=self.run, name=f"player-{self.user['name']}", daemon=True)
        t.start()
        return t
