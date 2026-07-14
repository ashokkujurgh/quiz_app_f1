import { get, post } from '../apiClient';
import type { Quiz, Question, QuizHistoryEntry, LeaderboardEntry } from '../../types';

export const fetchQuizzes = (params: { status?: string; subTopic?: string; q?: string } = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v && qs.set(k, String(v)));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return get<{ success: boolean; quizzes: Quiz[] }>(`/api/quizzes${suffix}`);
};

export const fetchQuiz = (id: string) => get<{ success: boolean; quiz: Quiz }>(`/api/quizzes/${id}`);

export const fetchQuizQuestions = (id: string) =>
  get<{ success: boolean; questions: Question[] }>(`/api/quizzes/${id}/questions`);

export const fetchMyHistory = () =>
  get<{ success: boolean; history: QuizHistoryEntry[] }>('/api/quizzes/my/history');

export const fetchMyQuizHistory = (id: string) =>
  get<{ success: boolean; history: QuizHistoryEntry & { answers?: unknown[] } }>(`/api/quizzes/${id}/my-history`);

export const fetchMyInvited = () => get<{ success: boolean; quizzes: Quiz[] }>('/api/quizzes/my/invited');

export const fetchQuizLeaderboard = (id: string) =>
  get<{ success: boolean; leaderboard: LeaderboardEntry[] }>(`/api/quizzes/${id}/leaderboard`);

export const fetchGlobalLeaderboard = () =>
  get<{ success: boolean; leaderboard: LeaderboardEntry[] }>('/api/quizzes/leaderboard/global');

export const startQuizPing = (id: string) => post<{ success: boolean }>(`/api/quizzes/${id}/start`, {});

export interface CreateQuizBody {
  title: string;
  description?: string;
  questionCount: number;
  selectionMode: 'random' | 'manual';
  topic: string;
  subTopic?: string;
  timezone?: string;
  scheduledAt: string;
  durationMinutes?: number;
  timeLimitPerQuestion?: number;
  participation?: 'public' | 'private' | 'invite_only';
  allowedUsers?: string[];
}

export const createQuiz = (body: CreateQuizBody) => post<{ success: boolean; quiz: Quiz }>('/api/quizzes', body);
