import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import * as quota from '../services/quota';
import { AppError } from '../utils/errors';

const publicReservation = (r: { _id: Types.ObjectId; credit: string; refKey: string; status: string; istDay: string; unlimited: boolean; expiresAt: Date }) => ({
  id: r._id.toString(), credit: r.credit, refKey: r.refKey, status: r.status, istDay: r.istDay, unlimited: r.unlimited, expiresAt: r.expiresAt,
});

// GET /api/billing/quota
export async function myQuota(req: AuthRequest, res: Response) {
  res.json({ success: true, quota: await quota.quotaSummary(req.user!.id) });
}

// GET /api/billing/quota/eligibility?action=quiz_play|quiz_create
export async function myEligibility(req: AuthRequest, res: Response) {
  const credit = String(req.query.action ?? '');
  quota.assertCredit(credit);
  res.json({ success: true, eligibility: await quota.eligibility(req.user!.id, credit) });
}

// ── Internal (quiz-service, post-service) ─────────────────────────────────────

function body(req: Request) {
  const { userId, credit, refKey, expiresAt, reason, forDay } = (req.body ?? {}) as Record<string, unknown>;
  if (userId !== undefined && (typeof userId !== 'string' || !Types.ObjectId.isValid(userId))) throw new AppError(400, 'Invalid userId.');
  quota.assertCredit(credit);
  return {
    userId: userId as string | undefined,
    credit,
    refKey: String(refKey ?? ''),
    expiresAt: typeof expiresAt === 'string' ? new Date(expiresAt) : undefined,
    reason: typeof reason === 'string' ? reason : 'released',
    forDay: typeof forDay === 'string' ? forDay : undefined,
  };
}

function needUser(id: string | undefined): string {
  if (!id) throw new AppError(400, 'userId is required.');
  return id;
}

export async function internalReserve(req: Request, res: Response) {
  const b = body(req);
  res.json({ success: true, reservation: publicReservation(await quota.reserve(needUser(b.userId), b.credit, b.refKey, b.expiresAt, b.forDay)) });
}

export async function internalConsume(req: Request, res: Response) {
  const b = body(req);
  res.json({ success: true, reservation: publicReservation(await quota.consume(needUser(b.userId), b.credit, b.refKey, b.expiresAt, b.forDay)) });
}

export async function internalRelease(req: Request, res: Response) {
  const b = body(req);
  res.json({ success: true, released: await quota.release(needUser(b.userId), b.credit, b.refKey, b.reason) });
}

export async function internalReleaseByRef(req: Request, res: Response) {
  const b = body(req);
  res.json({ success: true, released: await quota.releaseByRef(b.credit, b.refKey, b.reason) });
}

export async function internalEligibility(req: Request, res: Response) {
  const credit = String(req.query.credit ?? '');
  quota.assertCredit(credit);
  if (!Types.ObjectId.isValid(req.params.userId)) throw new AppError(400, 'Invalid userId.');
  res.json({ success: true, eligibility: await quota.eligibility(req.params.userId, credit, typeof req.query.forDay === 'string' ? req.query.forDay : undefined) });
}
