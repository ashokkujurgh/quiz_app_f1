import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import Payment, { IPayment } from '../models/Payment';
import UserSubscription, { IUserSubscription } from '../models/UserSubscription';
import AuditLog from '../models/AuditLog';
import { publicPayment, reconcilePayment } from '../services/payments';
import { grantSubscription, revokeSubscription } from '../services/subscriptions';
import { getEntitlements } from '../services/entitlements';
import { AppError } from '../utils/errors';
import { pageParams } from '../utils/http';

// GET /api/billing/admin/payments?status=&userId=
export async function adminListPayments(req: AuthRequest, res: Response) {
  const { page, limit, skip } = pageParams(req.query);
  const filter: Record<string, unknown> = {};
  if (typeof req.query.status === 'string' && req.query.status) filter.status = req.query.status;
  if (typeof req.query.userId === 'string' && Types.ObjectId.isValid(req.query.userId)) filter.userId = new Types.ObjectId(req.query.userId);
  const [items, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IPayment[]>(),
    Payment.countDocuments(filter),
  ]);
  res.json({ success: true, payments: items.map((p) => ({ ...publicPayment(p), userId: p.userId.toString(), events: p.events })), page, limit, total });
}

// GET /api/billing/admin/subscriptions?userId=&status=
export async function adminListSubscriptions(req: AuthRequest, res: Response) {
  const { page, limit, skip } = pageParams(req.query);
  const filter: Record<string, unknown> = {};
  if (typeof req.query.status === 'string' && req.query.status) filter.status = req.query.status;
  if (typeof req.query.userId === 'string' && Types.ObjectId.isValid(req.query.userId)) filter.userId = new Types.ObjectId(req.query.userId);
  const [items, total] = await Promise.all([
    UserSubscription.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IUserSubscription[]>(),
    UserSubscription.countDocuments(filter),
  ]);
  res.json({ success: true, subscriptions: items, page, limit, total });
}

// GET /api/billing/admin/users/:userId/entitlements
export async function adminUserEntitlements(req: AuthRequest, res: Response) {
  res.json({ success: true, entitlements: await getEntitlements(req.params.userId) });
}

// POST /api/billing/admin/payments/:id/reconcile
export async function adminReconcile(req: AuthRequest, res: Response) {
  if (!Types.ObjectId.isValid(req.params.id)) throw new AppError(400, 'Invalid payment id.');
  const p = await Payment.findById(req.params.id).lean<IPayment>();
  if (!p) throw new AppError(404, 'Payment not found.');
  const after = await reconcilePayment(p);
  await AuditLog.create({ actorId: new Types.ObjectId(req.user!.id), actorRole: 'admin', action: 'payment.reconcile',
    targetType: 'payment', targetId: p._id.toString(), details: { before: p.status, after: after.status } });
  res.json({ success: true, payment: publicPayment(after) });
}

// POST /api/billing/admin/subscriptions/grant  { userId, planCode, days, reason }
export async function adminGrant(req: AuthRequest, res: Response) {
  const { userId, planCode, days, reason } = req.body as { userId?: string; planCode?: string; days?: number; reason?: string };
  if (!userId || !Types.ObjectId.isValid(userId)) throw new AppError(400, 'Valid userId is required.');
  if (planCode !== 'premium' && planCode !== 'creator') throw new AppError(400, 'planCode must be premium or creator.');
  const sub = await grantSubscription(req.user!.id, userId, planCode, Number(days), String(reason ?? ''));
  res.status(201).json({ success: true, subscription: sub });
}

// POST /api/billing/admin/subscriptions/:id/revoke  { reason }
export async function adminRevoke(req: AuthRequest, res: Response) {
  if (!Types.ObjectId.isValid(req.params.id)) throw new AppError(400, 'Invalid subscription id.');
  await revokeSubscription(req.user!.id, req.params.id, String((req.body as { reason?: string })?.reason ?? ''));
  res.json({ success: true });
}
