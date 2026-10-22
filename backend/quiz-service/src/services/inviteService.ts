import { Types } from 'mongoose';
import GameInvite, { IGameInvite } from '../models/GameInvite';
import Quiz, { IQuiz } from '../models/Quiz';
import User from '../models/User';
import { checkEligibility, reserveCredit, releaseCredit, QuotaError } from './billingClient';
import { playRefKey, playExpiry, playDay } from './quotaKeys';

export const MAX_INVITES_PER_REQUEST = 50;

export class InviteError extends Error {
  constructor(public status: number, message: string, public code?: string, public upgradeTo?: string) { super(message); }
}

export interface InviteResult {
  userId:   string;
  status:   'invited' | 'already_invited' | 'blocked' | 'invalid';
  inviteId?: string;
  code?:    string;
  message?: string;
}

const OPEN_QUIZ = ['draft', 'scheduled', 'active'];

/**
 * Invite users to a custom game. Each invitee's play credit is checked first: a Free user who has
 * already used the day's credit is not invited and the inviter gets the reason back.
 */
export async function inviteUsers(quiz: IQuiz, inviterId: string, userIds: string[]): Promise<InviteResult[]> {
  if (!OPEN_QUIZ.includes(quiz.status)) throw new InviteError(400, 'This game has already finished.');
  const unique = [...new Set(userIds.map(String))].filter((id) => id !== inviterId);
  if (unique.length > MAX_INVITES_PER_REQUEST) throw new InviteError(400, `You can invite up to ${MAX_INVITES_PER_REQUEST} people at a time.`);

  const valid = unique.filter((id) => Types.ObjectId.isValid(id));
  const existingUsers = new Set(
    (await User.find({ _id: { $in: valid.map((id) => new Types.ObjectId(id)) }, isActive: { $ne: false } }).select('_id').lean())
      .map((u) => u._id.toString())
  );

  const refKey = playRefKey(quiz);
  const day    = playDay(quiz);
  const results: InviteResult[] = [];

  for (const userId of unique) {
    if (!existingUsers.has(userId)) { results.push({ userId, status: 'invalid', message: 'User not found.' }); continue; }

    const elig = await checkEligibility(userId, 'quiz_play', day);
    if (!elig.allowed) {
      results.push({ userId, status: 'blocked', code: elig.code, message: elig.message });
      continue;
    }

    const inviteeId = new Types.ObjectId(userId);
    const prior = await GameInvite.findOne({ quizId: quiz._id, inviteeId }).lean<IGameInvite>();
    if (prior && ['pending', 'accepted'].includes(prior.status) && prior.refKey === refKey) {
      results.push({ userId, status: 'already_invited', inviteId: prior._id.toString() });
      continue;
    }
    const invite = await GameInvite.findOneAndUpdate(
      { quizId: quiz._id, inviteeId },
      { $set: { inviterId: new Types.ObjectId(inviterId), status: 'pending', refKey, expiresAt: playExpiry(quiz), respondedAt: null } },
      { upsert: true, new: true }
    );
    await Quiz.updateOne({ _id: quiz._id }, { $addToSet: { allowedUsers: inviteeId } });
    results.push({ userId, status: 'invited', inviteId: invite._id.toString() });
  }
  return results;
}

async function loadInviteForInvitee(inviteId: string, userId: string) {
  if (!Types.ObjectId.isValid(inviteId)) throw new InviteError(400, 'Invalid invite id.');
  const invite = await GameInvite.findById(inviteId);
  if (!invite || invite.inviteeId.toString() !== userId) throw new InviteError(404, 'Invite not found.');
  return invite;
}

/** Accept: hold the invitee's play credit for this game. */
export async function acceptInvite(inviteId: string, userId: string): Promise<IGameInvite> {
  const invite = await loadInviteForInvitee(inviteId, userId);
  if (invite.status === 'accepted') return invite.toObject();
  if (!['pending', 'declined'].includes(invite.status)) throw new InviteError(409, `This invite is ${invite.status}.`);
  if (invite.expiresAt <= new Date()) throw new InviteError(409, 'This invite has expired.');

  const quiz = await Quiz.findById(invite.quizId);
  if (!quiz || !OPEN_QUIZ.includes(quiz.status) || playRefKey(quiz) !== invite.refKey) {
    throw new InviteError(409, 'This game is no longer available.');
  }

  try {
    await reserveCredit(userId, 'quiz_play', invite.refKey, playExpiry(quiz), playDay(quiz));
  } catch (err) {
    if (err instanceof QuotaError) throw new InviteError(err.status, err.message, err.code, err.upgradeTo);
    throw err;
  }

  const updated = await GameInvite.findOneAndUpdate(
    { _id: invite._id, status: { $in: ['pending', 'declined'] } },
    { $set: { status: 'accepted', respondedAt: new Date() } },
    { new: true }
  );
  if (!updated) {
    // Cancelled/expired between our read and write: don't keep the credit held
    await releaseCredit(userId, 'quiz_play', invite.refKey, 'invite_closed');
    throw new InviteError(409, 'This invite is no longer open.');
  }
  return updated.toObject();
}

export async function declineInvite(inviteId: string, userId: string): Promise<IGameInvite> {
  const invite = await loadInviteForInvitee(inviteId, userId);
  const updated = await GameInvite.findOneAndUpdate(
    { _id: invite._id, status: { $in: ['pending', 'accepted'] } },
    { $set: { status: 'declined', respondedAt: new Date() } },
    { new: true }
  );
  if (!updated) throw new InviteError(409, `This invite is ${invite.status}.`);
  if (invite.status === 'accepted') await releaseCredit(userId, 'quiz_play', invite.refKey, 'invite_declined');
  return updated.toObject();
}

/** Host (or admin) withdraws an invite. Any credit the invitee had reserved is given back. */
export async function cancelInvite(inviteId: string, actorId: string, actorIsAdmin: boolean): Promise<IGameInvite> {
  if (!Types.ObjectId.isValid(inviteId)) throw new InviteError(400, 'Invalid invite id.');
  const invite = await GameInvite.findById(inviteId);
  if (!invite) throw new InviteError(404, 'Invite not found.');
  if (!actorIsAdmin && invite.inviterId.toString() !== actorId) throw new InviteError(403, 'Only the host can cancel this invite.');

  const updated = await GameInvite.findOneAndUpdate(
    { _id: invite._id, status: { $in: ['pending', 'accepted'] } },
    { $set: { status: 'cancelled', respondedAt: new Date() } },
    { new: true }
  );
  if (!updated) throw new InviteError(409, `This invite is already ${invite.status}.`);
  await Quiz.updateOne({ _id: invite.quizId }, { $pull: { allowedUsers: invite.inviteeId } });
  await releaseCredit(invite.inviteeId.toString(), 'quiz_play', invite.refKey, 'invite_cancelled');
  return updated.toObject();
}

/** Background: close invites whose game window has passed and give back held credits. */
export async function expireInvites(now = new Date()): Promise<number> {
  const due = await GameInvite.find({ status: { $in: ['pending', 'accepted'] }, expiresAt: { $lt: now } }).limit(500).lean<IGameInvite[]>();
  let n = 0;
  for (const inv of due) {
    const r = await GameInvite.updateOne({ _id: inv._id, status: inv.status }, { $set: { status: 'expired' } });
    if (!r.modifiedCount) continue;
    n++;
    if (inv.status === 'accepted') await releaseCredit(inv.inviteeId.toString(), 'quiz_play', inv.refKey, 'invite_expired');
  }
  return n;
}

/** True if the user holds an accepted invite for this occurrence (their reservation must be kept). */
export async function hasAcceptedInvite(quizId: string, userId: string, refKey: string): Promise<boolean> {
  return !!(await GameInvite.exists({ quizId: new Types.ObjectId(quizId), inviteeId: new Types.ObjectId(userId), refKey, status: 'accepted' }));
}
