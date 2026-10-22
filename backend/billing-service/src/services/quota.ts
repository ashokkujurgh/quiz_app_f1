import { ClientSession, Types } from 'mongoose';
import UsageCounter, { CreditType, CREDIT_TYPES } from '../models/UsageCounter';
import QuotaReservation, { IQuotaReservation } from '../models/QuotaReservation';
import { getEntitlements, Entitlements } from './entitlements';
import { maybeTransaction } from './tx';
import { istDay, nextIstMidnight } from '../utils/ist';
import { AppError } from '../utils/errors';

// ── Rules ─────────────────────────────────────────────────────────────────────
// quiz_play   — Free: 1 per IST day, shared by daily quizzes and multiplayer/invited games.
// quiz_create — Free: 1 custom quiz per IST day.
// Practice tests are not a credit type: they never touch this service.
// Paid plans and admins: unlimited (reservations are still recorded, for idempotency and audit).

export const QUOTA_MESSAGES: Record<CreditType, string> = {
  quiz_play:   'You have used your free quiz limit for today. Upgrade to Premium to play unlimited quizzes.',
  quiz_create: 'You have used your free quiz creation for today. Upgrade to Premium to create unlimited quizzes.',
};

const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_TTL_MS     = 8 * 24 * 60 * 60 * 1000;

export function assertCredit(credit: unknown): asserts credit is CreditType {
  if (!CREDIT_TYPES.includes(credit as CreditType)) throw new AppError(400, 'Unknown credit type.');
}

function assertRefKey(refKey: unknown): asserts refKey is string {
  if (typeof refKey !== 'string' || !/^[A-Za-z0-9:_\-.]{3,200}$/.test(refKey)) throw new AppError(400, 'Invalid refKey.');
}

function quotaExceeded(credit: CreditType): AppError {
  return new AppError(403, QUOTA_MESSAGES[credit], 'QUOTA_EXCEEDED', { credit, upgradeTo: 'premium', resetsAt: nextIstMidnight() });
}

function limitFor(ent: Entitlements, credit: CreditType): number | null {
  return ent.dailyLimits[credit];
}

function opts(session: ClientSession | null) { return { session: session ?? undefined }; }

async function ensureCounter(userId: Types.ObjectId, day: string, credit: CreditType, session: ClientSession | null) {
  try {
    await UsageCounter.updateOne({ userId, istDay: day, credit }, { $setOnInsert: { used: 0, reserved: 0 } }, { upsert: true, ...opts(session) });
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err; // concurrent upsert created it — fine
  }
}

/** Atomically take one credit if used + reserved < limit. Returns false when none are left. */
async function takeSlot(userId: Types.ObjectId, day: string, credit: CreditType, limit: number, session: ClientSession | null): Promise<boolean> {
  const r = await UsageCounter.findOneAndUpdate(
    { userId, istDay: day, credit, $expr: { $lt: [{ $add: ['$used', '$reserved'] }, limit] } },
    { $inc: { reserved: 1 } },
    { new: true, ...opts(session) }
  );
  return !!r;
}

async function giveBackSlot(userId: Types.ObjectId, day: string, credit: CreditType, session: ClientSession | null) {
  await UsageCounter.updateOne({ userId, istDay: day, credit, reserved: { $gt: 0 } }, { $inc: { reserved: -1 } }, opts(session));
}

/**
 * Hold one credit for `refKey`. Idempotent: an existing reserved/consumed row is returned as-is.
 * Two concurrent calls for the last credit cannot both succeed (conditional $inc on one document).
 */
export async function reserve(userId: string, credit: CreditType, refKey: string, expiresAt?: Date, forDay?: string): Promise<IQuotaReservation> {
  assertCredit(credit); assertRefKey(refKey);
  const uid  = new Types.ObjectId(userId);
  const now  = new Date();
  const exp  = clampExpiry(expiresAt, now);
  const day  = creditDay(forDay, now);

  const existing = await QuotaReservation.findOne({ userId: uid, credit, refKey }).lean<IQuotaReservation>();
  if (existing && existing.status !== 'released') return existing;

  const ent   = await getEntitlements(userId, now);
  const limit = limitFor(ent, credit);

  // Created outside any transaction: a duplicate-key error inside one would abort it
  if (limit !== null) await ensureCounter(uid, day, credit, null);

  const isDup = (err: unknown) => (err as { code?: number }).code === 11000;
  const winner = async () => {
    const w = await QuotaReservation.findOne({ userId: uid, credit, refKey }).lean<IQuotaReservation>();
    if (!w || w.status === 'released') throw new AppError(409, 'Please try again.');
    return w;
  };

  try {
    return await maybeTransaction(async (session) => {
      if (limit !== null && !(await takeSlot(uid, day, credit, limit, session))) throw quotaExceeded(credit);

      const fields = { istDay: day, status: 'reserved' as const, unlimited: limit === null, expiresAt: exp, consumedAt: null, releasedAt: null, releaseReason: null };
      try {
        if (existing) {
          const revived = await QuotaReservation.findOneAndUpdate({ _id: existing._id, status: 'released' }, { $set: fields }, { new: true, ...opts(session) }).lean<IQuotaReservation>();
          if (revived) return revived;
        } else {
          const [created] = await QuotaReservation.create([{ userId: uid, credit, refKey, ...fields }], opts(session));
          return created.toObject();
        }
      } catch (err) {
        if (!isDup(err) || session) throw err; // in a transaction the rollback returns the slot
      }
      // Lost a race with an identical request (no transaction): hand back the slot we took
      if (limit !== null) await giveBackSlot(uid, day, credit, session);
      if (session) throw Object.assign(new Error('lost race'), { code: 11000 });
      return winner();
    });
  } catch (err) {
    if (isDup(err)) return winner();
    // No credit left — but an identical request for this same action may have just taken it
    if (err instanceof AppError && err.code === 'QUOTA_EXCEEDED') {
      for (let i = 0; i < 3; i++) {
        const same = await QuotaReservation.findOne({ userId: uid, credit, refKey, status: { $ne: 'released' } }).lean<IQuotaReservation>();
        if (same) return same;
        await new Promise((r) => setTimeout(r, 30));
      }
    }
    throw err;
  }
}

/** Turn a reservation into a used credit (reserving first if there is none). Idempotent. */
export async function consume(userId: string, credit: CreditType, refKey: string, expiresAt?: Date, forDay?: string): Promise<IQuotaReservation> {
  const r = await reserve(userId, credit, refKey, expiresAt, forDay);
  if (r.status === 'consumed') return r;
  return maybeTransaction(async (session) => {
    const done = await QuotaReservation.findOneAndUpdate(
      { _id: r._id, status: 'reserved' },
      { $set: { status: 'consumed', consumedAt: new Date() } },
      { new: true, ...opts(session) }
    ).lean<IQuotaReservation>();
    if (!done) {
      const now = await QuotaReservation.findById(r._id).session(session).lean<IQuotaReservation>();
      if (now?.status === 'consumed') return now;
      throw new AppError(409, 'This reservation was released. Please try again.');
    }
    if (!done.unlimited) {
      await UsageCounter.updateOne({ userId: done.userId, istDay: done.istDay, credit, reserved: { $gt: 0 } }, { $inc: { reserved: -1, used: 1 } }, opts(session));
    }
    return done;
  });
}

/** Give back an unconsumed reservation. Consumed credits are never released. Idempotent. */
export async function release(userId: string, credit: CreditType, refKey: string, reason: string): Promise<boolean> {
  assertCredit(credit); assertRefKey(refKey);
  const r = await QuotaReservation.findOne({ userId: new Types.ObjectId(userId), credit, refKey, status: 'reserved' }).lean<IQuotaReservation>();
  if (!r) return false;
  return releaseRow(r, reason);
}

async function releaseRow(r: IQuotaReservation, reason: string): Promise<boolean> {
  return maybeTransaction(async (session) => {
    const done = await QuotaReservation.findOneAndUpdate(
      { _id: r._id, status: 'reserved' },
      { $set: { status: 'released', releasedAt: new Date(), releaseReason: reason.slice(0, 100) } },
      { new: true, ...opts(session) }
    );
    if (!done) return false;
    if (!done.unlimited) await giveBackSlot(done.userId, done.istDay, done.credit, session);
    return true;
  });
}

/** Release every unconsumed reservation for an action (e.g. the host cancelled the game). */
export async function releaseByRef(credit: CreditType, refKey: string, reason: string): Promise<number> {
  assertCredit(credit); assertRefKey(refKey);
  const rows = await QuotaReservation.find({ credit, refKey, status: 'reserved' }).lean<IQuotaReservation[]>();
  let n = 0;
  for (const r of rows) if (await releaseRow(r, reason)) n++;
  return n;
}

/** Background: release reservations past their expiry (invite expired, game never started). */
export async function releaseExpired(now = new Date()): Promise<number> {
  const rows = await QuotaReservation.find({ status: 'reserved', expiresAt: { $lt: now } }).limit(500).lean<IQuotaReservation[]>();
  let n = 0;
  for (const r of rows) if (await releaseRow(r, 'expired')) n++;
  return n;
}

/** Background: rebuild counters from yesterday onwards (incl. future game days) from the reservation rows (repairs crash leftovers). */
export async function reconcileCounters(now = new Date()): Promise<number> {
  const yesterday = istDay(new Date(now.getTime() - 86_400_000));
  const agg = await QuotaReservation.aggregate<{ _id: { userId: Types.ObjectId; istDay: string; credit: CreditType }; used: number; reserved: number }>([
    { $match: { istDay: { $gte: yesterday }, unlimited: false } },
    { $group: {
      _id: { userId: '$userId', istDay: '$istDay', credit: '$credit' },
      used:     { $sum: { $cond: [{ $eq: ['$status', 'consumed'] }, 1, 0] } },
      reserved: { $sum: { $cond: [{ $eq: ['$status', 'reserved'] }, 1, 0] } },
    } },
  ]);
  let fixed = 0;
  for (const g of agg) {
    const r = await UsageCounter.updateOne(
      { userId: g._id.userId, istDay: g._id.istDay, credit: g._id.credit, $or: [{ used: { $ne: g.used } }, { reserved: { $ne: g.reserved } }] },
      { $set: { used: g.used, reserved: g.reserved } }
    );
    fixed += r.modifiedCount;
  }
  return fixed;
}

export interface CreditStatus {
  credit: CreditType; unlimited: boolean; limit: number | null; used: number; reserved: number; remaining: number | null;
}

export async function quotaSummary(userId: string, now = new Date(), forDay?: string) {
  const ent = await getEntitlements(userId, now);
  const day = creditDay(forDay, now);
  const counters = await UsageCounter.find({ userId: new Types.ObjectId(userId), istDay: day }).lean();
  const credits = {} as Record<CreditType, CreditStatus>;
  for (const credit of CREDIT_TYPES) {
    const c = counters.find((x) => x.credit === credit);
    const limit = limitFor(ent, credit);
    const used = c?.used ?? 0;
    const reserved = c?.reserved ?? 0;
    credits[credit] = { credit, unlimited: limit === null, limit, used, reserved, remaining: limit === null ? null : Math.max(0, limit - used - reserved) };
  }
  return {
    plan: ent.plan,
    isPaid: ent.isPaid,
    istDay: day,
    resetsAt: day === istDay(now) ? nextIstMidnight(now) : null,
    credits,
    practice: { unlimited: true, consumesCredits: false },
  };
}

export async function eligibility(userId: string, credit: CreditType, forDay?: string) {
  assertCredit(credit);
  const s = await quotaSummary(userId, new Date(), forDay);
  const c = s.credits[credit];
  const allowed = c.unlimited || (c.remaining ?? 0) > 0;
  return {
    allowed,
    credit,
    remaining: c.remaining,
    unlimited: c.unlimited,
    resetsAt: s.resetsAt,
    ...(allowed ? {} : { code: 'QUOTA_EXCEEDED', message: QUOTA_MESSAGES[credit], upgradeTo: 'premium' }),
  };
}

function clampExpiry(expiresAt: Date | undefined, now: Date): Date {
  const t = expiresAt && !isNaN(expiresAt.getTime()) ? expiresAt.getTime() : now.getTime() + DEFAULT_TTL_MS;
  return new Date(Math.min(Math.max(t, now.getTime() + 60_000), now.getTime() + MAX_TTL_MS));
}

const MAX_DAYS_AHEAD = 8;

/**
 * Which IST day a credit counts against. Default: today. A game scheduled for a later day
 * (e.g. an invite accepted today for tomorrow's game) uses that day's credit, up to 8 days ahead.
 */
export function creditDay(forDay: string | undefined, now = new Date()): string {
  const today = istDay(now);
  if (!forDay) return today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(forDay)) throw new AppError(400, 'Invalid forDay.');
  const latest = istDay(new Date(now.getTime() + MAX_DAYS_AHEAD * 86_400_000));
  if (forDay < today) return today;
  if (forDay > latest) throw new AppError(400, 'That game is too far ahead to reserve a credit for.');
  return forDay;
}
