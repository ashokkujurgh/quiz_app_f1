import { Response, RequestHandler } from 'express';
import { Types } from 'mongoose';
import Quiz from '../models/Quiz';
import GameInvite from '../models/GameInvite';
import { AuthRequest } from '../middleware/auth';
import * as invites from '../services/inviteService';
import { checkEligibility, QuotaError } from '../services/billingClient';
import { playDay } from '../services/quotaKeys';

function fail(res: Response, err: unknown, fallback: string): void {
  if (err instanceof invites.InviteError || err instanceof QuotaError) {
    res.status(err.status).json({ success: false, message: err.message, ...(err.code ? { code: err.code } : {}), ...(err.upgradeTo ? { upgradeTo: err.upgradeTo } : {}) });
    return;
  }
  console.error(err);
  res.status(500).json({ success: false, message: fallback });
}

// POST /api/quizzes/:id/invites  { userIds: string[] }  — host or admin
export const createInvites: RequestHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) { res.status(400).json({ success: false, message: 'Invalid quiz id.' }); return; }
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) { res.status(404).json({ success: false, message: 'Quiz not found.' }); return; }
    const isAdmin = req.user!.role === 'admin';
    if (!isAdmin && quiz.createdBy.toString() !== req.user!.id) {
      res.status(403).json({ success: false, message: 'Only the host can invite players.' }); return;
    }
    const userIds = (req.body as { userIds?: unknown }).userIds;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ success: false, message: 'userIds must be a non-empty list.' }); return;
    }
    const results = await invites.inviteUsers(quiz, req.user!.id, userIds.map(String));
    res.status(201).json({ success: true, results });
  } catch (err) {
    fail(res, err, 'Failed to send invites.');
  }
};

// GET /api/quizzes/my/invites — open invites for me, with whether I can still play today
export const getMyInvites: RequestHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const list = await GameInvite.find({
      inviteeId: new Types.ObjectId(req.user!.id),
      status: { $in: ['pending', 'accepted'] },
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 }).limit(50).lean();

    const quizzes = await Quiz.find({ _id: { $in: list.map((i) => i.quizId) } })
      .select('title image scheduledAt durationMinutes status participation createdBy startedAt').lean();
    const byId = new Map(quizzes.map((q) => [q._id.toString(), q]));

    const out = [];
    for (const inv of list) {
      const quiz = byId.get(inv.quizId.toString());
      if (!quiz) continue;
      let canPlay: { allowed: boolean; message?: string; code?: string } = { allowed: true };
      if (inv.status === 'pending') {
        try {
          const e = await checkEligibility(req.user!.id, 'quiz_play', playDay(quiz));
          canPlay = { allowed: e.allowed, message: e.message, code: e.code };
        } catch { canPlay = { allowed: true }; } // shown as available; accept re-checks
      }
      out.push({
        id: inv._id.toString(), status: inv.status, expiresAt: inv.expiresAt, createdAt: inv.createdAt,
        inviterId: inv.inviterId.toString(),
        quiz: { id: quiz._id.toString(), title: quiz.title, image: quiz.image, scheduledAt: quiz.scheduledAt, durationMinutes: quiz.durationMinutes, status: quiz.status },
        canPlay,
      });
    }
    res.json({ success: true, invites: out });
  } catch (err) {
    fail(res, err, 'Failed to fetch invites.');
  }
};

// POST /api/quizzes/invites/:inviteId/accept
export const acceptInvite: RequestHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({ success: true, invite: await invites.acceptInvite(req.params.inviteId, req.user!.id) });
  } catch (err) {
    fail(res, err, 'Failed to accept invite.');
  }
};

// POST /api/quizzes/invites/:inviteId/decline
export const declineInvite: RequestHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({ success: true, invite: await invites.declineInvite(req.params.inviteId, req.user!.id) });
  } catch (err) {
    fail(res, err, 'Failed to decline invite.');
  }
};

// POST /api/quizzes/invites/:inviteId/cancel  — host or admin
export const cancelInvite: RequestHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({ success: true, invite: await invites.cancelInvite(req.params.inviteId, req.user!.id, req.user!.role === 'admin') });
  } catch (err) {
    fail(res, err, 'Failed to cancel invite.');
  }
};

// GET /api/quizzes/:id/invites — host or admin: who was invited and their status
export const listQuizInvites: RequestHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) { res.status(400).json({ success: false, message: 'Invalid quiz id.' }); return; }
    const quiz = await Quiz.findById(req.params.id).select('createdBy').lean();
    if (!quiz) { res.status(404).json({ success: false, message: 'Quiz not found.' }); return; }
    if (req.user!.role !== 'admin' && quiz.createdBy.toString() !== req.user!.id) {
      res.status(403).json({ success: false, message: 'Only the host can see invites.' }); return;
    }
    const list = await GameInvite.find({ quizId: quiz._id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, invites: list.map((i) => ({ id: i._id.toString(), inviteeId: i.inviteeId.toString(), status: i.status, expiresAt: i.expiresAt, respondedAt: i.respondedAt })) });
  } catch (err) {
    fail(res, err, 'Failed to fetch invites.');
  }
};
