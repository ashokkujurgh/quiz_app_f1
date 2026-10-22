import { IQuiz } from '../models/Quiz';
import { istDay } from '../utils/ist';

type QuizLike = Pick<IQuiz, '_id' | 'scheduledAt' | 'durationMinutes' | 'startedAt'>;

const GRACE_MS = 30 * 60 * 1000;

/**
 * One play credit per quiz occurrence. Recurring quizzes reuse the same document with a new
 * scheduledAt, so the occurrence's start time is part of the key.
 */
export function playRefKey(quiz: QuizLike): string {
  return `play:${quiz._id.toString()}:${new Date(quiz.scheduledAt).getTime()}`;
}

/** When an unused play reservation for this occurrence should be given back automatically. */
export function playExpiry(quiz: QuizLike): Date {
  const start = quiz.startedAt ? new Date(quiz.startedAt) : new Date(quiz.scheduledAt);
  return new Date(Math.max(start.getTime(), Date.now()) + quiz.durationMinutes * 60_000 + GRACE_MS);
}

/** The IST day whose Free play credit this occurrence uses: the day it starts (today if already started). */
export function playDay(quiz: QuizLike): string {
  const start = quiz.startedAt ? new Date(quiz.startedAt) : new Date(quiz.scheduledAt);
  return istDay(new Date(Math.max(start.getTime(), Date.now())));
}
