import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as mod from '../services/moderation';
import * as violations from '../services/violations';
import { screenRevision } from '../services/screening';
import ReviewAction from '../models/ReviewAction';
import PremiumPostRevision from '../models/PremiumPostRevision';
import { pageParams } from '../utils/http';
import { AppError } from '../utils/errors';

const staff = (req: AuthRequest) => mod.requireStaff(req.user!.id);

// GET /api/moderation/queue?status=pending|approved|rejected&mine=true
export async function queue(req: AuthRequest, res: Response) {
  const actor = await staff(req);
  const { page, limit, skip } = pageParams(req.query);
  const r = await mod.queue(actor, { status: String(req.query.status ?? 'pending'), mine: req.query.mine === 'true', skip, limit });
  res.json({ success: true, items: r.items, total: r.total, page, limit });
}

export async function detail(req: AuthRequest, res: Response) {
  res.json({ success: true, ...(await mod.detail(await staff(req), req.params.revisionId)) });
}

export async function approve(req: AuthRequest, res: Response) {
  res.json({ success: true, result: await mod.approve(await staff(req), req.params.revisionId, (req.body as { note?: string })?.note) });
}

// POST /:revisionId/reject  { reason, violation?, violationCategory?, note? }
export async function reject(req: AuthRequest, res: Response) {
  res.json({ success: true, result: await mod.reject(await staff(req), req.params.revisionId, req.body ?? {}) });
}

export async function note(req: AuthRequest, res: Response) {
  await mod.addNote(await staff(req), req.params.revisionId, (req.body as { note?: string })?.note ?? '');
  res.status(201).json({ success: true });
}

// POST /:revisionId/assign  { reviewerId }  (admin)
export async function assign(req: AuthRequest, res: Response) {
  await mod.reassign(await staff(req), req.params.revisionId, String((req.body as { reviewerId?: string })?.reviewerId ?? ''));
  res.json({ success: true });
}

// POST /:revisionId/rescreen  (admin) — re-run automatic screening, e.g. after a provider outage
export async function rescreen(req: AuthRequest, res: Response) {
  const actor = await mod.requireAdmin(req.user!.id);
  const rev = await PremiumPostRevision.findById(req.params.revisionId).select('premiumPostId creatorId').lean();
  if (!rev) throw new AppError(404, 'Review not found.');
  const v = await screenRevision(req.params.revisionId, true);
  await ReviewAction.create({ revisionId: rev._id, premiumPostId: rev.premiumPostId, creatorId: rev.creatorId, actorId: actor.id, actorRole: 'admin', action: 'screened', details: { status: v.status, rerun: true } });
  res.json({ success: true, screening: { status: v.status, errorCode: v.errorCode, output: v.output, heuristics: v.heuristics } });
}

// GET /api/moderation/history?actorId=&creatorId=
export async function history(req: AuthRequest, res: Response) {
  const actor = await staff(req);
  const { page, limit, skip } = pageParams(req.query);
  const r = await mod.history(actor, { actorId: req.query.actorId as string | undefined, creatorId: req.query.creatorId as string | undefined, skip, limit });
  res.json({ success: true, items: r.items, total: r.total, page, limit });
}

export async function appeals(req: AuthRequest, res: Response) {
  await staff(req);
  const { page, limit, skip } = pageParams(req.query);
  const r = await mod.pendingAppeals(skip, limit);
  res.json({ success: true, items: r.items, total: r.total, page, limit });
}

// POST /api/moderation/violations/:id/overturn  { reason }
export async function overturn(req: AuthRequest, res: Response) {
  const actor = await staff(req);
  res.json({ success: true, violation: await violations.overturnViolation(actor, req.params.id, String((req.body as { reason?: string })?.reason ?? '')) });
}

// POST /api/moderation/violations/:id/appeal-decision  { decision: uphold|overturn, note }
export async function appealDecision(req: AuthRequest, res: Response) {
  const actor = await staff(req);
  const { decision, note } = (req.body ?? {}) as { decision?: string; note?: string };
  if (decision !== 'uphold' && decision !== 'overturn') throw new AppError(400, 'decision must be uphold or overturn.');
  res.json({ success: true, violation: await violations.decideAppeal(actor, req.params.id, decision, String(note ?? '')) });
}

// ── Creator side (mounted under /api/posts/premium) ──────────────────────────
export async function myStanding(req: AuthRequest, res: Response) {
  res.json({ success: true, standing: await violations.creatorStanding(req.user!.id) });
}

export async function myAppeal(req: AuthRequest, res: Response) {
  const v = await violations.submitAppeal(req.user!.id, req.params.violationId, String((req.body as { text?: string })?.text ?? ''));
  res.status(201).json({ success: true, appeal: { violationId: v._id.toString(), status: v.appeal.status, submittedAt: v.appeal.submittedAt } });
}
