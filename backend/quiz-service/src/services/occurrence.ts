import GameInvite from '../models/GameInvite';
import { IQuiz } from '../models/Quiz';
import { releaseAllForRef } from './billingClient';
import { playRefKey } from './quotaKeys';

type QuizLike = Pick<IQuiz, '_id' | 'scheduledAt' | 'durationMinutes' | 'startedAt'>;

/**
 * A quiz occurrence is over (finished, cancelled, deleted or moved): give back every play credit
 * still only *reserved* for it (invitees who never joined) and close its open invites.
 * Credits already used by players are untouched. Safe to call more than once.
 */
export async function closeOccurrence(quiz: QuizLike, reason: string): Promise<void> {
  const refKey = playRefKey(quiz);
  await releaseAllForRef('quiz_play', refKey, reason);
  await GameInvite.updateMany(
    { quizId: quiz._id, refKey, status: { $in: ['pending', 'accepted'] } },
    { $set: { status: reason === 'cancelled' ? 'cancelled' : 'expired' } }
  ).catch((e) => console.error('[invites] close occurrence:', e));
}
