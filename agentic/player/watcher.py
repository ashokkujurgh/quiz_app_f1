"""
QuizWatcher — polls the quiz service every POLL_INTERVAL seconds.

When an admin quiz goes active:
  - Picks a random subset of the 10 players (MIN_PLAYERS_PER_QUIZ to MAX_PLAYERS_PER_QUIZ)
  - Launches each chosen player in its own thread
  - Each new quiz gets a fresh random draw, so player counts vary per game

Only admin-created quizzes are considered.
"""
import logging
import random
import threading
import time

from auth import get_admin_user_id
from config import PLAYER_USERS, MIN_PLAYERS_PER_QUIZ, MAX_PLAYERS_PER_QUIZ, POLL_INTERVAL
from player_agent import PlayerAgent
from quiz_client import get_admin_quizzes

logger = logging.getLogger(__name__)


class QuizWatcher:
    def __init__(self, admin_user_id: str | None):
        self.admin_user_id = admin_user_id
        # quiz_id → True (prevents re-launching the same quiz)
        self._seen: set[str] = set()
        self._lock = threading.Lock()

    def _pick_random_players(self) -> list[dict]:
        """
        Pick a random subset of 10 players.
        Count varies between MIN_PLAYERS_PER_QUIZ and MAX_PLAYERS_PER_QUIZ,
        so no two quizzes necessarily get the same number of players.
        """
        count = random.randint(MIN_PLAYERS_PER_QUIZ, MAX_PLAYERS_PER_QUIZ)
        chosen = random.sample(PLAYER_USERS, count)
        return chosen

    def _launch_for_quiz(self, quiz: dict) -> None:
        quiz_id    = str(quiz["_id"])
        quiz_title = quiz.get("title", quiz_id)

        players = self._pick_random_players()
        names   = [p["name"] for p in players]

        logger.info("━" * 55)
        logger.info("Admin quiz ACTIVE: '%s'", quiz_title)
        logger.info("%d players selected: %s", len(players), names)
        logger.info("━" * 55)

        threads: list[threading.Thread] = []
        for user in players:
            agent = PlayerAgent(user, quiz_id)
            t = agent.start_thread()
            threads.append(t)
            # Small stagger so connections don't all arrive simultaneously
            time.sleep(random.uniform(0.3, 1.2))

        def _wait_all():
            for t in threads:
                t.join()
            logger.info("All %d players finished quiz '%s'", len(players), quiz_title)

        threading.Thread(target=_wait_all, daemon=True).start()

    def _poll(self) -> None:
        quizzes = get_admin_quizzes(self.admin_user_id)
        for quiz in quizzes:
            quiz_id = str(quiz["_id"])
            with self._lock:
                if quiz_id in self._seen:
                    continue
                self._seen.add(quiz_id)
            # Launch in a thread so polling is not blocked
            threading.Thread(
                target=self._launch_for_quiz,
                args=(quiz,),
                daemon=True,
            ).start()

    def run_forever(self) -> None:
        logger.info("QuizWatcher started — polling every %ds for admin quizzes.", POLL_INTERVAL)
        while True:
            try:
                self._poll()
            except Exception as exc:
                logger.error("Poll error: %s", exc)
            time.sleep(POLL_INTERVAL)
