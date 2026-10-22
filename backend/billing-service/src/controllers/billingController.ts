import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import Payment, { IPayment } from '../models/Payment';
import UserSubscription, { IUserSubscription } from '../models/UserSubscription';
import { getPlans, publicPlan } from '../services/plans';
import { getEntitlements } from '../services/entitlements';
import * as payments from '../services/payments';
import { isConfigured } from '../services/razorpay';
import { AppError } from '../utils/errors';
import { pageParams } from '../utils/http';

const publicSub = (s: IUserSubscription) => ({
  id: s._id.toString(), planCode: s.planCode, status: s.status, startsAt: s.startsAt, endsAt: s.endsAt,
  source: s.source, bonusDays: s.bonusDays, renewalReminders: s.renewalReminders, statusReason: s.statusReason,
  paymentId: s.paymentId?.toString() ?? null, createdAt: s.createdAt,
});

// GET /api/billing/plans  (public)
export async function listPlans(_req: AuthRequest, res: Response) {
  const plans = (await getPlans()).filter((p) => p.isActive).map(publicPlan);
  res.json({
    success: true,
    plans,
    paymentsEnabled: isConfigured(),
    billingNote: 'Paid plans are one-time payments for 30 days and do not renew automatically.',
  });
}

// GET /api/billing/subscription
export async function getMySubscription(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const [ent, history, openPayment] = await Promise.all([
    getEntitlements(userId),
    UserSubscription.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 }).limit(20).lean<IUserSubscription[]>(),
    Payment.findOne({ userId: new Types.ObjectId(userId), status: { $in: ['created', 'pending'] } }).sort({ createdAt: -1 }).lean<IPayment>(),
  ]);
  const DAY = 86_400_000;
  res.json({
    success: true,
    entitlements: ent,
    status: ent.isPaid ? 'active' : (history.some((h) => h.status === 'expired' || (h.status === 'active' && h.endsAt <= new Date())) ? 'expired' : 'free'),
    daysLeft: ent.subscription ? Math.max(0, Math.ceil((new Date(ent.subscription.endsAt).getTime() - Date.now()) / DAY)) : 0,
    history: history.map(publicSub),
    openPayment: openPayment ? payments.publicPayment(openPayment) : null,
    paymentsEnabled: isConfigured(),
  });
}

// POST /api/billing/checkout  { planCode, idempotencyKey? }
export async function checkout(req: AuthRequest, res: Response) {
  const { planCode, idempotencyKey } = req.body as { planCode?: string; idempotencyKey?: string };
  const checkout = await payments.startCheckout(req.user!.id, String(planCode ?? ''), idempotencyKey);
  res.status(201).json({ success: true, checkout });
}

// POST /api/billing/verify  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
export async function verify(req: AuthRequest, res: Response) {
  const p = await payments.verifyCheckout(req.user!.id, req.body ?? {});
  const ent = await getEntitlements(req.user!.id);
  res.status(p.status === 'paid' ? 200 : 202).json({ success: true, payment: payments.publicPayment(p), entitlements: ent });
}

// POST /api/billing/payments/:id/cancel  (user closed checkout)
export async function cancelCheckout(req: AuthRequest, res: Response) {
  const p = await payments.cancelCheckout(req.user!.id, req.params.id);
  res.json({ success: true, payment: payments.publicPayment(p) });
}

// GET /api/billing/payments
export async function listPayments(req: AuthRequest, res: Response) {
  const { page, limit, skip } = pageParams(req.query);
  const filter = { userId: new Types.ObjectId(req.user!.id) };
  const [items, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IPayment[]>(),
    Payment.countDocuments(filter),
  ]);
  res.json({ success: true, payments: items.map(payments.publicPayment), page, limit, total });
}

// GET /api/billing/payments/:id  — status poll; re-checks Razorpay for unfinished payments
const lastPoll = new Map<string, number>();
export async function getPayment(req: AuthRequest, res: Response) {
  if (!Types.ObjectId.isValid(req.params.id)) throw new AppError(400, 'Invalid payment id.');
  let p = await Payment.findOne({ _id: req.params.id, userId: new Types.ObjectId(req.user!.id) }).lean<IPayment>();
  if (!p) throw new AppError(404, 'Payment not found.');

  const ageMs = Date.now() - new Date(p.createdAt).getTime();
  const last  = lastPoll.get(p._id.toString()) ?? 0;
  if (['created', 'pending', 'cancelled'].includes(p.status) && ageMs > 20_000 && Date.now() - last > 15_000) {
    lastPoll.set(p._id.toString(), Date.now());
    try { p = await payments.reconcilePayment(p); }
    catch (err) { console.warn('[billing] poll reconcile failed:', (err as Error).message); }
  }
  res.json({ success: true, payment: payments.publicPayment(p) });
}

// POST /api/billing/subscription/cancel — one-time passes don't renew; this turns off renewal reminders
export async function cancelSubscription(req: AuthRequest, res: Response) {
  await UserSubscription.updateMany(
    { userId: new Types.ObjectId(req.user!.id), status: 'active' },
    { $set: { renewalReminders: false } }
  );
  const ent = await getEntitlements(req.user!.id);
  res.json({
    success: true,
    message: ent.subscription
      ? `Renewal reminders are off. Your ${ent.plan.name} plan stays active until ${new Date(ent.subscription.endsAt).toDateString()} and will not be charged again.`
      : 'You are on the Free plan. There is nothing to cancel.',
    entitlements: ent,
  });
}

// GET /api/billing/entitlements
export async function myEntitlements(req: AuthRequest, res: Response) {
  res.json({ success: true, entitlements: await getEntitlements(req.user!.id) });
}
