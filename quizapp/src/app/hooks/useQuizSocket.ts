import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;

export interface QuestionEvent {
  quizId:        string;
  questionIndex: number;
  questionId:    string;
  question:      string;
  options:       string[];
  timeLimit:     number;
  total:         number;
}

export interface QuestionEndedEvent {
  quizId:        string;
  questionIndex: number;
  correctAnswer: number;
  correctOption: string;
}

export interface TotalTimerQuestion {
  questionId: string;
  question:   string;
  options:    string[];
}

export interface GameStartedEvent {
  quizId: string;
  mode:   'per_question' | 'total_timer';
  // per_question
  totalQuestions?:       number;
  timeLimitPerQuestion?: number;
  // total_timer
  durationSeconds?:  number;
  remainingSeconds?: number;
  questions?:        TotalTimerQuestion[];
}

export interface LeaderboardRow {
  rank:        number;
  userId:      string;
  userName:    string;
  userAvatar?: string;
  score:       number;
  total:       number;
  percentage:  number;
  timeTaken:   number;
}

export interface GameOverEvent {
  quizId:      string;
  leaderboard: LeaderboardRow[];
}

export interface PlayerInfo {
  userId:      string;
  userName:    string;
  userAvatar?: string;
}

export interface QuizActivatedEvent {
  quizId: string;
  title:  string;
}

interface Handlers {
  onGameStarted?:    (e: GameStartedEvent)     => void;
  onQuestion?:       (e: QuestionEvent)         => void;
  onQuestionEnded?:  (e: QuestionEndedEvent)    => void;
  onGameOver?:       (e: GameOverEvent)         => void;
  onGameError?:      (e: { message: string })   => void;
  onPlayerJoined?:   (p: PlayerInfo)            => void;
  onPlayerLeft?:     (e: { userId: string })    => void;
  onPlayersList?:    (e: { players: PlayerInfo[] }) => void;
  onQuizActivated?:  (e: QuizActivatedEvent)    => void;
}

export function useQuizSocket(
  quizId:    string | undefined,
  token:     string | null,
  userName:  string,
  userAvatar: string | undefined,
  handlers:  Handlers,
) {
  const socketRef    = useRef<Socket | null>(null);
  const handlersRef  = useRef<Handlers>(handlers);
  handlersRef.current = handlers;

  const submitAnswer = useCallback(
    (questionId: string, questionIndex: number, answer: number) => {
      socketRef.current?.emit('submit_answer', { quizId, questionId, questionIndex, answer });
    },
    [quizId],
  );

  useEffect(() => {
    if (!quizId || !token) return;

    const socket = io(SOCKET_URL, {
      path: '/quiz.io/',
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[QuizSocket] connected', socket.id);
      socket.emit('join_game', { quizId, userName, userAvatar });
    });

    socket.on('connect_error', (err) => {
      console.error('[QuizSocket] connect error:', err.message);
    });

    socket.on('game_started',    (e: GameStartedEvent)         => handlersRef.current.onGameStarted?.(e));
    socket.on('question',        (e: QuestionEvent)            => handlersRef.current.onQuestion?.(e));
    socket.on('question_ended',  (e: QuestionEndedEvent)       => handlersRef.current.onQuestionEnded?.(e));
    socket.on('game_over',       (e: GameOverEvent)            => handlersRef.current.onGameOver?.(e));
    socket.on('game_error',      (e: { message: string })      => handlersRef.current.onGameError?.(e));
    socket.on('player_joined',   (p: PlayerInfo)               => handlersRef.current.onPlayerJoined?.(p));
    socket.on('player_left',     (e: { userId: string })       => handlersRef.current.onPlayerLeft?.(e));
    socket.on('players_list',    (e: { players: PlayerInfo[] }) => handlersRef.current.onPlayersList?.(e));
    socket.on('quiz_activated',  (e: QuizActivatedEvent)       => handlersRef.current.onQuizActivated?.(e));

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [quizId, token]);

  return { submitAnswer };
}
