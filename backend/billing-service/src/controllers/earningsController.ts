import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import CreatorProfile from '../models/CreatorProfile';
import * as earnings from '../services/earnings';
import { AppError } from '../utils/errors';
import { pageParams } from '../utils/http';

/** Creator earnings pages are for anyone who has onboarded (also after the plan lapses). */
async function requireCreatorProfile(userId: string): Promise<void> {
  if (!(await CreatorProfile.exists({ userId: new Types.ObjectId(userId) }))) {
    throw new AppError(403, 'Earnings are available to creators. Complete creator onboarding first.', 'NOT_A_CREATOR');
  }
}

// GET /api/creator/earnings/summary
export async function summary(req: AuthRequest, res: Response) {
  await requireCreatorProfile(req.user!.id);
  res.json({ success: true, summary: await earnings.summary(req.user!.id) });
}

// GET /api/creator/balance
export async function balance(req: AuthRequest, res: Response) {
  await requireCreatorProfile(req.user!.id);
  res.json({ success: true, balance: await earnings.balancesFromRollups(req.user!.id) });
}

// GET /api/creator/earnings/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD&granularity=day|month&postId=
export async function analytics(req: AuthRequest, res: Response) {
  await requireCreatorProfile(req.user!.id);
  const q = req.query as Record<string, string | undefined>;
  res.json({ success: true, analytics: await earnings.analytics(req.user!.id, { from: q.from, to: q.to, granularity: q.granularity, postId: q.postId }) });
}

// GET /api/creator/earnings/ledger?type=&page&limit
export async function ledger(req: AuthRequest, res: Response) {
  await requireCreatorProfile(req.user!.id);
  const { page, limit, skip } = pageParams(req.query);
  const r = await earnings.ledgerPage(req.user!.id, { type: req.query.type as string | undefined, skip, limit });
  res.json({ success: true, entries: r.items, total: r.total, page, limit });
}

// ── Admin ─────────────────────────────────────────────────────────────────────

// POST /api/billing/admin/earnings/reverse  { viewEventIds? | postId+fromDay+toDay, reason }
export async function adminReverse(req: AuthRequest, res: Response) {
  const { viewEventIds, postId, fromDay, toDay, reason } = (req.body ?? {}) as { viewEventIds?: string[]; postId?: string; fromDay?: string; toDay?: string; reason?: string };
  const reversed = await earnings.reverseViews(req.user!.id, { viewEventIds, postId, fromDay, toDay }, String(reason ?? ''));
  res.json({ success: true, reversed });
}

// POST /api/billing/admin/earnings/adjust  { creatorId, amountPaise, reason }
export async function adminAdjust(req: AuthRequest, res: Response) {
  const { creatorId, amountPaise, reason } = (req.body ?? {}) as { creatorId?: string; amountPaise?: number; reason?: string };
  if (!creatorId || !Types.ObjectId.isValid(creatorId)) throw new AppError(400, 'Valid creatorId is required.');
  res.status(201).json({ success: true, entry: await earnings.adjust(req.user!.id, creatorId, Number(amountPaise), String(reason ?? '')) });
}

// POST /api/billing/admin/earnings/reconcile  { days?, creatorId? }
export async function adminReconcile(req: AuthRequest, res: Response) {
  const { days, creatorId } = (req.body ?? {}) as { days?: number; creatorId?: string };
  res.json({ success: true, result: await earnings.reconcile({ days: Number(days) || undefined, creatorId }) });
}

// GET /api/billing/admin/creators/:userId/balance — ledger truth and rollup side by side
export async function adminCreatorBalance(req: AuthRequest, res: Response) {
  const [ledger, rollups] = await Promise.all([earnings.balancesFromLedger(req.params.userId), earnings.balancesFromRollups(req.params.userId)]);
  res.json({ success: true, ledger, rollups, consistent: JSON.stringify(ledger) === JSON.stringify(rollups) });
}

// ── Internal (post-service) ───────────────────────────────────────────────────

// POST /internal/views/record
export async function internalRecordView(req: Request, res: Response) {
  res.json({ success: true, result: await earnings.recordView(req.body ?? {}) });
}

// POST /internal/earnings/posts  { creatorId, postIds[] }
export async function internalPostStats(req: Request, res: Response) {
  const { creatorId, postIds } = (req.body ?? {}) as { creatorId?: string; postIds?: string[] };
  if (!creatorId || !Types.ObjectId.isValid(creatorId) || !Array.isArray(postIds) || postIds.length > 200) throw new AppError(400, 'creatorId and up to 200 postIds are required.');
  res.json({ success: true, stats: await earnings.perPostStats(creatorId, postIds.map(String)) });
}
