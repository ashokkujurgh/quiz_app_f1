import { ClientSession, Types } from 'mongoose';
import UserSubscription, { IUserSubscription } from '../models/UserSubscription';
import Payment, { IPayment } from '../models/Payment';
import AuditLog from '../models/AuditLog';
import { getPlan } from './plans';
import { withLock } from './lock';
import { maybeTransaction } from './tx';
import { MAX_PREPAID_DAYS } from '../config/plans';
import { AppError } from '../utils/errors';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface Timeline {
  startsAt:   Date;
  endsAt:     Date;
  bonusMs:    number;
  convertIds: Types.ObjectId[];   // lower-tier periods whose unused time becomes bonus
}

/**
 * Where a new period of `planCode` would sit:
 * - Unused time on lower-tier periods (current or queued) is converted by value into extra time
 *   on the new plan, and those periods end (status 'converted').
 * - The new period starts when the last same-or-higher-tier period ends (renewal stacks), or now.
 */
export async function computeTimeline(userId: Types.ObjectId, planCode: 'premium' | 'creator', now: Date, session: ClientSession | null = null): Promise<Timeline> {
  const plan = await getPlan(planCode);
  if (!plan || plan.pricePaise <= 0) throw new AppError(400, 'This plan cannot be purchased.');

  const subs = await UserSubscription.find({ userId, status: 'active', endsAt: { $gt: now } }).session(session).lean<IUserSubscription[]>();

  let bonusMs = 0;
  const convertIds: Types.ObjectId[] = [];
  let startsAt = now;

  for (const s of subs) {
    if (s.tier < plan.tier) {
      const lowerPlan = await getPlan(s.planCode);
      const remaining = s.endsAt.getTime() - Math.max(s.startsAt.getTime(), now.getTime());
      if (lowerPlan && remaining > 0) bonusMs += Math.floor(remaining * lowerPlan.pricePaise / plan.pricePaise);
      convertIds.push(s._id);
    } else if (s.endsAt > startsAt) {
      startsAt = s.endsAt;
    }
  }

  const endsAt = new Date(startsAt.getTime() + plan.periodDays * DAY_MS + bonusMs);
  return { startsAt, endsAt, bonusMs, convertIds };
}

export async function assertWithinPrepaidLimit(userId: Types.ObjectId, planCode: 'premium' | 'creator', now = new Date()): Promise<void> {
  const t = await computeTimeline(userId, planCode, now);
  if (t.endsAt.getTime() - now.getTime() > MAX_PREPAID_DAYS * DAY_MS) {
    throw new AppError(409, `You already have this plan paid up to ${t.startsAt.toDateString()}. You can renew closer to that date.`, 'PREPAID_LIMIT');
  }
}

/**
 * Turn a verified, captured payment into a subscription period. Idempotent: calling it any number
 * of times (verify + webhook + reconcile, in any order or concurrently) creates exactly one period.
 */
export async function activatePayment(paymentId: Types.ObjectId, razorpayPaymentId: string, method: string | null, source: 'verify' | 'webhook' | 'reconcile'): Promise<IPayment> {
  const first = await Payment.findById(paymentId).lean<IPayment>();
  if (!first) throw new AppError(404, 'Payment not found.');

  return withLock(`user:${first.userId.toString()}`, () => maybeTransaction(async (session) => {
    const payment = await Payment.findById(paymentId).session(session);
    if (!payment) throw new AppError(404, 'Payment not found.');
    if (payment.subscriptionId) return payment.toObject();                       // already activated
    if (payment.status === 'refunded') return payment.toObject();                // refunded before we saw the capture

    const now = new Date();
    let sub = await UserSubscription.findOne({ paymentId: payment._id }).session(session);
    if (!sub) {
      const plan = (await getPlan(payment.planCode))!;
      const t = await computeTimeline(payment.userId, payment.planCode, now, session);
      [sub] = await UserSubscription.create([{
        userId:    payment.userId,
        planCode:  payment.planCode,
        tier:      plan.tier,
        status:    'active',
        startsAt:  t.startsAt,
        endsAt:    t.endsAt,
        paymentId: payment._id,
        source:    'razorpay',
        bonusDays: Math.round((t.bonusMs / DAY_MS) * 100) / 100,
      }], { session: session ?? undefined });
      if (t.convertIds.length) {
        await UserSubscription.updateMany(
          { _id: { $in: t.convertIds }, status: 'active' },
          { $set: { status: 'converted', convertedInto: sub._id, statusReason: `Upgraded to ${plan.name}` } },
          { session: session ?? undefined }
        );
      }
    }

    payment.status            = 'paid';
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.method            = method;
    payment.paidAt            = payment.paidAt ?? now;
    payment.subscriptionId    = sub._id;
    payment.failureReason     = null;
    payment.events.push({ at: now, type: 'activated', source });
    await payment.save({ session: session ?? undefined });
    return payment.toObject();
  }));
}

/** Refund seen at Razorpay. A full refund ends that period's access; a partial one is recorded only. */
export async function applyRefund(payment: IPayment, refundedPaise: number, source: 'webhook' | 'reconcile'): Promise<void> {
  const full = refundedPaise >= payment.amountPaise;
  await maybeTransaction(async (session) => {
    await Payment.updateOne(
      { _id: payment._id },
      {
        $max:  { refundedPaise },
        $set:  { status: full ? 'refunded' : 'partially_refunded' },
        $push: { events: { at: new Date(), type: full ? 'refunded' : 'partially_refunded', source, note: `${refundedPaise} paise` } },
      },
      { session: session ?? undefined }
    );
    if (full && payment.subscriptionId) {
      await UserSubscription.updateOne(
        { _id: payment.subscriptionId, status: 'active' },
        { $set: { status: 'refunded', statusReason: 'Payment refunded' } },
        { session: session ?? undefined }
      );
    }
  });
}

/** Admin: give a user a plan for N days without payment (support, testing). Logged. */
export async function grantSubscription(actorId: string, userId: string, planCode: 'premium' | 'creator', days: number, reason: string): Promise<IUserSubscription> {
  if (!Number.isInteger(days) || days < 1 || days > 366) throw new AppError(400, 'days must be a whole number from 1 to 366.');
  if (!reason?.trim()) throw new AppError(400, 'A reason is required.');
  const uid = new Types.ObjectId(userId);
  return withLock(`user:${userId}`, async () => {
    const plan = (await getPlan(planCode))!;
    const now = new Date();
    const t = await computeTimeline(uid, planCode, now);
    const endsAt = new Date(t.startsAt.getTime() + days * DAY_MS + t.bonusMs);
    const sub = await UserSubscription.create({
      userId: uid, planCode, tier: plan.tier, status: 'active', startsAt: t.startsAt, endsAt,
      source: 'admin_grant', bonusDays: Math.round((t.bonusMs / DAY_MS) * 100) / 100, statusReason: reason.trim(),
    });
    if (t.convertIds.length) {
      await UserSubscription.updateMany({ _id: { $in: t.convertIds }, status: 'active' },
        { $set: { status: 'converted', convertedInto: sub._id, statusReason: `Upgraded to ${plan.name}` } });
    }
    await AuditLog.create({ actorId: new Types.ObjectId(actorId), actorRole: 'admin', action: 'subscription.grant',
      targetType: 'user', targetId: userId, details: { planCode, days, reason: reason.trim(), subscriptionId: sub._id.toString() } });
    return sub.toObject();
  });
}

export async function revokeSubscription(actorId: string, subscriptionId: string, reason: string): Promise<void> {
  if (!reason?.trim()) throw new AppError(400, 'A reason is required.');
  const sub = await UserSubscription.findOneAndUpdate(
    { _id: subscriptionId, status: 'active' },
    { $set: { status: 'revoked', statusReason: reason.trim() } },
    { new: true }
  );
  if (!sub) throw new AppError(404, 'No active subscription with that id.');
  await AuditLog.create({ actorId: new Types.ObjectId(actorId), actorRole: 'admin', action: 'subscription.revoke',
    targetType: 'subscription', targetId: subscriptionId, details: { reason: reason.trim(), userId: sub.userId.toString() } });
}

/** Housekeeping: mark periods whose end has passed. Entitlements don't depend on this. */
export async function markExpired(now = new Date()): Promise<number> {
  const r = await UserSubscription.updateMany({ status: 'active', endsAt: { $lte: now } }, { $set: { status: 'expired' } });
  return r.modifiedCount;
}
