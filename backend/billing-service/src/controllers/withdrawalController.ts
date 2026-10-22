import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as w from '../services/withdrawals';
import { AppError } from '../utils/errors';
import { pageParams } from '../utils/http';

const me = (req: AuthRequest) => req.user!.id;

// ── Creator ───────────────────────────────────────────────────────────────────
export async function listMethods(req: AuthRequest, res: Response) { res.json({ success: true, methods: await w.listMethods(me(req)) }); }

// POST /api/creator/payout-methods  { type, details }
export async function addMethod(req: AuthRequest, res: Response) {
  const { type, details } = (req.body ?? {}) as { type?: unknown; details?: unknown };
  res.status(201).json({ success: true, method: await w.addMethod(me(req), type, details) });
}

export async function removeMethod(req: AuthRequest, res: Response) { await w.removeMethod(me(req), req.params.id); res.json({ success: true }); }

export async function eligibility(req: AuthRequest, res: Response) { res.json({ success: true, eligibility: await w.eligibility(me(req)) }); }

// POST /api/creator/withdrawals  { amountPaise, payoutMethodId, idempotencyKey }
export async function request(req: AuthRequest, res: Response) {
  res.status(201).json({ success: true, withdrawal: await w.requestWithdrawal(me(req), req.body ?? {}) });
}

export async function list(req: AuthRequest, res: Response) {
  const { page, limit, skip } = pageParams(req.query);
  const r = await w.listForCreator(me(req), skip, limit);
  res.json({ success: true, withdrawals: r.items, total: r.total, page, limit });
}

export async function getOne(req: AuthRequest, res: Response) { res.json({ success: true, withdrawal: await w.getForCreator(me(req), req.params.id) }); }

export async function cancel(req: AuthRequest, res: Response) { res.json({ success: true, withdrawal: await w.cancelByCreator(me(req), req.params.id) }); }

// ── Admin ─────────────────────────────────────────────────────────────────────
export async function adminList(req: AuthRequest, res: Response) {
  const { page, limit, skip } = pageParams(req.query);
  const r = await w.adminList({ status: req.query.status as string | undefined, creatorId: req.query.creatorId as string | undefined, skip, limit });
  res.json({ success: true, withdrawals: r.items, total: r.total, page, limit });
}

export async function adminDetail(req: AuthRequest, res: Response) { res.json({ success: true, ...(await w.adminDetail(req.params.id)) }); }

// GET /api/billing/admin/withdrawals/:id/payout-details — decrypted, audited, never cached
export async function adminReveal(req: AuthRequest, res: Response) {
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, payout: await w.revealPayoutDetails(me(req), req.params.id) });
}

// POST /api/billing/admin/withdrawals/:id/:action  (review | approve | reject | process | paid | failed)
export async function adminAct(req: AuthRequest, res: Response) {
  const action = req.params.action as w.AdminAction;
  if (!['review', 'approve', 'reject', 'process', 'paid', 'failed'].includes(action)) throw new AppError(404, 'Unknown action.');
  const updated = await w.adminAction(me(req), req.params.id, action, req.body ?? {});
  res.json({ success: true, withdrawal: { ...w.withdrawalView(updated), creatorId: updated.creatorId.toString() } });
}

// GET /api/billing/admin/withdrawals/export.csv?status=&from=&to=
export async function adminExport(req: AuthRequest, res: Response) {
  const csv = await w.exportCsv(me(req), { status: req.query.status as string | undefined, from: req.query.from as string | undefined, to: req.query.to as string | undefined });
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="meenzo-withdrawals-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.set('Cache-Control', 'no-store');
  res.send(csv);
}

export async function adminReconcile(_req: AuthRequest, res: Response) { res.json({ success: true, result: await w.reconcileWithdrawals() }); }
