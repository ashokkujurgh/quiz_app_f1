import { Types, ClientSession } from 'mongoose';
import ViewEvent, { IViewEvent, IneligibleReason } from '../models/ViewEvent';
import LedgerEntry, { ILedgerEntry } from '../models/LedgerEntry';
import DailyEarning from '../models/DailyEarning';
import CreatorProfile from '../models/CreatorProfile';
import User from '../models/User';
import AuditLog from '../models/AuditLog';
import { getEntitlements } from './entitlements';
import { maybeTransaction } from './tx';
import { PAISE_PER_VIEW, earningsConfig, EARNINGS_DISCLAIMER } from '../config/earnings';
import { istDay } from '../utils/ist';
import { AppError } from '../utils/errors';

const DAY = 86_400_000;
const o = (s: ClientSession | null) => ({ session: s ?? undefined });
const oid = (id: string, what = 'id') => {
  if (!Types.ObjectId.isValid(id)) throw new AppError(400, `Invalid ${what}.`);
  return new Types.ObjectId(id);
};

// ── Recording views ────────────────────────────────────────────────────────────

export interface RecordViewInput {
  postId: string; premiumPostId: string; creatorId: string;
  viewerKey: string; ipHash?: string | null; occurredAt?: string;
}

export interface RecordViewResult { counted: boolean; eligible: boolean; duplicate: boolean; reason: IneligibleReason }

/**
 * Record one view sent by post-service (which already checked the signed view token, dwell time,
 * bots, rate limits and that the post is an approved, published premium post).
 * Exactly-once: a unique (post, viewer, window) row; the 10-paise credit is unique per view event.
 */
export async function recordView(input: RecordViewInput): Promise<RecordViewResult> {
  const postId = oid(input.postId, 'postId');
  const premiumPostId = oid(input.premiumPostId, 'premiumPostId');
  const creatorId = oid(input.creatorId, 'creatorId');
  if (!/^(u|a):[A-Za-z0-9_-]{8,64}$/.test(input.viewerKey ?? '')) throw new AppError(400, 'Invalid viewerKey.');
  const viewerType: 'user' | 'anon' = input.viewerKey.startsWith('u:') ? 'user' : 'anon';

  // Delivery may be delayed by retries; never accept future or very old timestamps
  const now = Date.now();
  const t = input.occurredAt ? Date.parse(input.occurredAt) : now;
  const occurredAt = new Date(Number.isFinite(t) ? Math.min(now, Math.max(now - 2 * DAY, t)) : now);
  const cfg = earningsConfig();
  const windowMs = cfg.dedupeHours * 3_600_000;
  const windowStart = new Date(Math.floor(occurredAt.getTime() / windowMs) * windowMs);
  const day = istDay(occurredAt);

  // Already counted in this window? (cheap pre-check; the unique index is the real guard)
  if (await ViewEvent.exists({ postId, viewerKey: input.viewerKey, windowStart })) return { counted: false, eligible: false, duplicate: true, reason: null };

  let reason: IneligibleReason = null;
  if (input.viewerKey === `u:${creatorId}`) reason = 'self_view';
  if (!reason) {
    const [ent, profile] = await Promise.all([getEntitlements(creatorId.toString()), CreatorProfile.findOne({ userId: creatorId }).select('status').lean()]);
    if (!ent.features.creatorTools) reason = 'creator_plan_inactive';        // policy: no earnings while the plan has lapsed
    else if (profile?.status === 'suspended') reason = 'creator_suspended';
  }
  if (!reason && viewerType === 'user') {
    const viewer = await User.findById(input.viewerKey.slice(2)).select('isActive').lean().catch(() => null);
    if (!viewer || viewer.isActive === false) reason = 'viewer_inactive';
  }
  if (!reason && viewerType === 'anon' && input.ipHash) {
    const fromSameNetwork = await ViewEvent.countDocuments({ postId, ipHash: input.ipHash, istDay: day, viewerType: 'anon' });
    if (fromSameNetwork >= cfg.maxAnonPerIpPostDay) reason = 'suspicious_ip';
  }
  const eligible = reason === null;

  try {
    await maybeTransaction(async (s) => {
      const [ev] = await ViewEvent.create([{
        postId, premiumPostId, creatorId, viewerKey: input.viewerKey, viewerType, windowStart, istDay: day, occurredAt,
        eligible, ineligibleReason: reason, ipHash: input.ipHash ?? null,
      }], o(s));
      if (eligible) await creditView(ev, s);
      else await DailyEarning.updateOne({ creatorId, postId, istDay: day }, { $inc: { ineligibleViews: 1 }, $setOnInsert: { premiumPostId } }, { upsert: true, ...o(s) });
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return { counted: false, eligible: false, duplicate: true, reason: null };
    throw err;
  }
  return { counted: true, eligible, duplicate: false, reason };
}

/** Create the 10-paise credit for an eligible view (idempotent) and update the daily rollup. */
async function creditView(ev: Pick<IViewEvent, '_id' | 'creatorId' | 'postId' | 'premiumPostId' | 'istDay' | 'occurredAt'>, s: ClientSession | null): Promise<void> {
  let entry;
  try {
    [entry] = await LedgerEntry.create([{
      creatorId: ev.creatorId, type: 'view_credit', amountPaise: PAISE_PER_VIEW, istDay: ev.istDay,
      postId: ev.postId, premiumPostId: ev.premiumPostId, viewEventId: ev._id,
    }], o(s));
  } catch (err) {
    if ((err as { code?: number }).code === 11000 && !s) return; // already credited (repair path)
    throw err;
  }
  await ViewEvent.updateOne({ _id: ev._id }, { $set: { ledgerEntryId: entry._id } }, o(s));
  await DailyEarning.updateOne(
    { creatorId: ev.creatorId, postId: ev.postId, istDay: ev.istDay },
    { $inc: { eligibleViews: 1, creditedPaise: PAISE_PER_VIEW }, $max: { lastViewAt: ev.occurredAt }, $setOnInsert: { premiumPostId: ev.premiumPostId } },
    { upsert: true, ...o(s) }
  );
}

// ── Corrections (admin) ────────────────────────────────────────────────────────

/** Reverse view credits found invalid. One reversal per credit, ever. Returns how many were reversed. */
export async function reverseViews(actorId: string, filter: { viewEventIds?: string[]; postId?: string; fromDay?: string; toDay?: string }, reason: string): Promise<number> {
  if (!reason?.trim() || reason.trim().length < 5) throw new AppError(400, 'A reason is required.');
  const q: Record<string, unknown> = { type: 'view_credit', reversedAt: null };
  if (filter.viewEventIds?.length) q.viewEventId = { $in: filter.viewEventIds.map((id) => oid(id, 'viewEventId')) };
  else if (filter.postId && filter.fromDay && filter.toDay) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(filter.fromDay) || !/^\d{4}-\d{2}-\d{2}$/.test(filter.toDay)) throw new AppError(400, 'Days must be YYYY-MM-DD.');
    q.postId = oid(filter.postId, 'postId');
    q.istDay = { $gte: filter.fromDay, $lte: filter.toDay };
  } else throw new AppError(400, 'Give viewEventIds, or postId with fromDay and toDay.');

  const credits = await LedgerEntry.find(q).limit(100_000).lean<ILedgerEntry[]>();
  let n = 0;
  for (const c of credits) {
    try {
      const done = await maybeTransaction(async (s) => {
        const marked = await LedgerEntry.updateOne({ _id: c._id, reversedAt: null }, { $set: { reversedAt: new Date() } }, o(s));
        if (!marked.modifiedCount) return false;
        await LedgerEntry.create([{ creatorId: c.creatorId, type: 'view_reversal', amountPaise: -c.amountPaise, istDay: c.istDay, postId: c.postId,
          premiumPostId: c.premiumPostId, viewEventId: c.viewEventId, reversalOf: c._id, reason: reason.trim(), actorId: oid(actorId) }], o(s));
        await DailyEarning.updateOne({ creatorId: c.creatorId, postId: c.postId, istDay: c.istDay }, { $inc: { reversedPaise: c.amountPaise } }, o(s));
        return true;
      });
      if (done) n++;
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
    }
  }
  await AuditLog.create({ actorId: oid(actorId), actorRole: 'admin', action: 'earnings.reverse', targetType: filter.postId ? 'post' : 'views',
    targetId: filter.postId ?? `${filter.viewEventIds?.length ?? 0} views`, details: { ...filter, reason: reason.trim(), reversed: n } });
  return n;
}

/** Manual ± correction to a creator's earnings, with a reason. Counts as approved immediately. */
export async function adjust(actorId: string, creatorId: string, amountPaise: number, reason: string): Promise<ILedgerEntry> {
  if (!Number.isInteger(amountPaise) || amountPaise === 0 || Math.abs(amountPaise) > 10_000_000) throw new AppError(400, 'amountPaise must be a non-zero whole number of paise (max ₹1,00,000).');
  if (!reason?.trim() || reason.trim().length < 5) throw new AppError(400, 'A reason is required.');
  const e = await LedgerEntry.create({ creatorId: oid(creatorId), type: 'adjustment', amountPaise, istDay: istDay(), reason: reason.trim(), actorId: oid(actorId) });
  await AuditLog.create({ actorId: oid(actorId), actorRole: 'admin', action: 'earnings.adjust', targetType: 'user', targetId: creatorId, details: { amountPaise, reason: reason.trim(), entryId: e._id.toString() } });
  return e.toObject();
}

// ── Balances ───────────────────────────────────────────────────────────────────

export interface Balances {
  estimatedPaise: number;    // views today (IST) — may still change
  pendingPaise:   number;    // views from the last `holdDays` days, waiting to clear
  approvedPaise:  number;    // cleared earnings + adjustments (lifetime)
  availablePaise: number;    // approved − withdrawn/held
  inWithdrawalPaise: number; // held for open withdrawal requests
  paidPaise:      number;    // paid out
  reversedPaise:  number;    // removed as invalid (lifetime)
  adjustmentsPaise: number;
  holdDays:       number;
}

/** IST-day boundaries for the buckets. */
export function bucketDays(now = new Date()) {
  const { holdDays } = earningsConfig();
  return { today: istDay(now), clearedThrough: istDay(new Date(now.getTime() - holdDays * DAY)), holdDays };
}

/** Withdrawal holds split into open vs paid. Phase 7 replaces this with the withdrawal states. */
export type WithdrawalSplit = (creatorId: Types.ObjectId) => Promise<{ inWithdrawalPaise: number; paidPaise: number }>;
let withdrawalSplit: WithdrawalSplit = async (creatorId) => {
  const r = await LedgerEntry.aggregate<{ _id: null; net: number }>([
    { $match: { creatorId, type: { $in: ['withdrawal_hold', 'withdrawal_release'] } } },
    { $group: { _id: null, net: { $sum: '$amountPaise' } } },
  ]);
  return { inWithdrawalPaise: -(r[0]?.net ?? 0), paidPaise: 0 };
};
export function setWithdrawalSplit(fn: WithdrawalSplit): void { withdrawalSplit = fn; }

async function nonViewSums(creatorId: Types.ObjectId) {
  const rows = await LedgerEntry.aggregate<{ _id: string; sum: number }>([
    { $match: { creatorId, type: { $in: ['adjustment', 'withdrawal_hold', 'withdrawal_release'] } } },
    { $group: { _id: '$type', sum: { $sum: '$amountPaise' } } },
  ]);
  const m = Object.fromEntries(rows.map((r) => [r._id, r.sum])) as Record<string, number>;
  return { adjustments: m.adjustment ?? 0, holds: m.withdrawal_hold ?? 0, releases: m.withdrawal_release ?? 0 };
}

function assemble(view: { today: number; pending: number; cleared: number; reversed: number }, other: { adjustments: number; holds: number; releases: number }, split: { inWithdrawalPaise: number; paidPaise: number }, holdDays: number): Balances {
  const approved = view.cleared + other.adjustments;
  return {
    estimatedPaise: view.today,
    pendingPaise: view.pending,
    approvedPaise: approved,
    availablePaise: approved + other.holds + other.releases,
    inWithdrawalPaise: split.inWithdrawalPaise,
    paidPaise: split.paidPaise,
    reversedPaise: view.reversed,
    adjustmentsPaise: other.adjustments,
    holdDays,
  };
}

/** Balances straight from the ledger (the source of truth). Used for withdrawals and reconciliation. */
export async function balancesFromLedger(creatorId: string, now = new Date()): Promise<Balances> {
  const cid = oid(creatorId);
  const { today, clearedThrough, holdDays } = bucketDays(now);
  const rows = await LedgerEntry.aggregate<{ _id: string; net: number; reversed: number }>([
    { $match: { creatorId: cid, type: { $in: ['view_credit', 'view_reversal'] } } },
    { $group: {
      _id: { $cond: [{ $gte: ['$istDay', today] }, 'today', { $cond: [{ $lte: ['$istDay', clearedThrough] }, 'cleared', 'pending'] }] },
      net: { $sum: '$amountPaise' },
      reversed: { $sum: { $cond: [{ $eq: ['$type', 'view_reversal'] }, { $multiply: ['$amountPaise', -1] }, 0] } },
    } },
  ]);
  const m = Object.fromEntries(rows.map((r) => [r._id, r])) as Record<string, { net: number; reversed: number }>;
  const view = { today: m.today?.net ?? 0, pending: m.pending?.net ?? 0, cleared: m.cleared?.net ?? 0, reversed: rows.reduce((a, r) => a + r.reversed, 0) };
  return assemble(view, await nonViewSums(cid), await withdrawalSplit(cid), holdDays);
}

/** Same numbers from the daily rollups (fast; checked against the ledger by reconciliation). */
export async function balancesFromRollups(creatorId: string, now = new Date()): Promise<Balances> {
  const cid = oid(creatorId);
  const { today, clearedThrough, holdDays } = bucketDays(now);
  const rows = await DailyEarning.aggregate<{ _id: string; net: number; reversed: number }>([
    { $match: { creatorId: cid } },
    { $group: {
      _id: { $cond: [{ $gte: ['$istDay', today] }, 'today', { $cond: [{ $lte: ['$istDay', clearedThrough] }, 'cleared', 'pending'] }] },
      net: { $sum: { $subtract: ['$creditedPaise', '$reversedPaise'] } },
      reversed: { $sum: '$reversedPaise' },
    } },
  ]);
  const m = Object.fromEntries(rows.map((r) => [r._id, r])) as Record<string, { net: number; reversed: number }>;
  const view = { today: m.today?.net ?? 0, pending: m.pending?.net ?? 0, cleared: m.cleared?.net ?? 0, reversed: rows.reduce((a, r) => a + r.reversed, 0) };
  return assemble(view, await nonViewSums(cid), await withdrawalSplit(cid), holdDays);
}

// ── Dashboard reads ────────────────────────────────────────────────────────────

export async function summary(creatorId: string, now = new Date()) {
  const cid = oid(creatorId);
  const today = istDay(now);
  const month = today.slice(0, 7);
  const [balances, views, ent] = await Promise.all([
    balancesFromRollups(creatorId, now),
    DailyEarning.aggregate<{ _id: null; total: number; today: number; month: number; posts: Types.ObjectId[] }>([
      { $match: { creatorId: cid } },
      { $group: {
        _id: null,
        total: { $sum: '$eligibleViews' },
        today: { $sum: { $cond: [{ $eq: ['$istDay', today] }, '$eligibleViews', 0] } },
        month: { $sum: { $cond: [{ $eq: [{ $substrCP: ['$istDay', 0, 7] }, month] }, '$eligibleViews', 0] } },
        posts: { $addToSet: '$postId' },
      } },
    ]),
    getEntitlements(creatorId, now),
  ]);
  const v = views[0];
  return {
    views: { eligibleTotal: v?.total ?? 0, today: v?.today ?? 0, thisMonth: v?.month ?? 0, postsWithViews: v?.posts.length ?? 0 },
    balances,
    paisePerView: PAISE_PER_VIEW,
    earningPaused: !ent.features.creatorTools,
    disclaimer: EARNINGS_DISCLAIMER,
  };
}

export async function analytics(creatorId: string, q: { from?: string; to?: string; granularity?: string; postId?: string }) {
  const cid = oid(creatorId);
  const to = q.to && /^\d{4}-\d{2}-\d{2}$/.test(q.to) ? q.to : istDay();
  const from = q.from && /^\d{4}-\d{2}-\d{2}$/.test(q.from) ? q.from : istDay(new Date(Date.parse(to) - 29 * DAY));
  if (from > to) throw new AppError(400, '"from" must be on or before "to".');
  if ((Date.parse(to) - Date.parse(from)) / DAY > 366) throw new AppError(400, 'Choose a range of at most one year.');
  const monthly = q.granularity === 'month';

  const match: Record<string, unknown> = { creatorId: cid, istDay: { $gte: from, $lte: to } };
  if (q.postId) match.postId = oid(q.postId, 'postId');      // only ever this creator's rows
  const rows = await DailyEarning.aggregate<{ _id: string; views: number; earned: number }>([
    { $match: match },
    { $group: { _id: monthly ? { $substrCP: ['$istDay', 0, 7] } : '$istDay', views: { $sum: '$eligibleViews' }, earned: { $sum: { $subtract: ['$creditedPaise', '$reversedPaise'] } } } },
  ]);
  const byKey = new Map(rows.map((r) => [r._id, r]));

  // Fill gaps so charts show zero days/months
  const series: { period: string; eligibleViews: number; earnedPaise: number }[] = [];
  const seen = new Set<string>();
  for (let t = Date.parse(from); t <= Date.parse(to); t += DAY) {
    const d = new Date(t).toISOString().slice(0, 10);
    const key = monthly ? d.slice(0, 7) : d;
    if (seen.has(key)) continue;
    seen.add(key);
    const r = byKey.get(key);
    series.push({ period: key, eligibleViews: r?.views ?? 0, earnedPaise: r?.earned ?? 0 });
  }
  return {
    from, to, granularity: monthly ? 'month' : 'day', postId: q.postId ?? null, series,
    totals: { eligibleViews: series.reduce((a, s) => a + s.eligibleViews, 0), earnedPaise: series.reduce((a, s) => a + s.earnedPaise, 0) },
    disclaimer: EARNINGS_DISCLAIMER,
  };
}

export async function ledgerPage(creatorId: string, q: { type?: string; skip: number; limit: number }) {
  const filter: Record<string, unknown> = { creatorId: oid(creatorId) };
  if (q.type && ['view_credit', 'view_reversal', 'adjustment', 'withdrawal_hold', 'withdrawal_release'].includes(q.type)) filter.type = q.type;
  const [items, total] = await Promise.all([
    LedgerEntry.find(filter).sort({ createdAt: -1 }).skip(q.skip).limit(q.limit)
      .select('type amountPaise istDay postId premiumPostId withdrawalId reason reversedAt createdAt').lean(),
    LedgerEntry.countDocuments(filter),
  ]);
  return { items, total };
}

/** Per-post numbers for the creator's posts table. */
export async function perPostStats(creatorId: string, postIds: string[], now = new Date()) {
  const { today, clearedThrough } = bucketDays(now);
  const ids = postIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
  const rows = await DailyEarning.aggregate<{ _id: Types.ObjectId; views: number; earned: number; approved: number; estimated: number; lastViewAt: Date | null }>([
    { $match: { creatorId: oid(creatorId), postId: { $in: ids } } },
    { $group: {
      _id: '$postId',
      views: { $sum: '$eligibleViews' },
      earned: { $sum: { $subtract: ['$creditedPaise', '$reversedPaise'] } },
      approved: { $sum: { $cond: [{ $lte: ['$istDay', clearedThrough] }, { $subtract: ['$creditedPaise', '$reversedPaise'] }, 0] } },
      estimated: { $sum: { $cond: [{ $gte: ['$istDay', today] }, { $subtract: ['$creditedPaise', '$reversedPaise'] }, 0] } },
      lastViewAt: { $max: '$lastViewAt' },
    } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id.toString(), { eligibleViews: r.views, earnedPaise: r.earned, approvedPaise: r.approved, estimatedPaise: r.estimated, lastViewAt: r.lastViewAt }]));
}

// ── Reconciliation ─────────────────────────────────────────────────────────────

/**
 * Check the rollups against the ledger and view events for recent days and repair them;
 * also create any credit a crash left missing for an eligible view. Returns what it found.
 */
export async function reconcile(opts: { days?: number; creatorId?: string } = {}) {
  const days = Math.min(400, Math.max(1, opts.days ?? 10));
  const since = istDay(new Date(Date.now() - days * DAY));
  const scope: Record<string, unknown> = { istDay: { $gte: since } };
  if (opts.creatorId) scope.creatorId = oid(opts.creatorId);

  // 1) Eligible views without a credit (crash between writes)
  const missing = await ViewEvent.find({ ...scope, eligible: true, ledgerEntryId: null, createdAt: { $lt: new Date(Date.now() - 60_000) } }).limit(5000).lean<IViewEvent[]>();
  let repairedCredits = 0;
  for (const ev of missing) {
    const has = await LedgerEntry.findOne({ type: 'view_credit', viewEventId: ev._id }).select('_id').lean();
    if (has) { await ViewEvent.updateOne({ _id: ev._id }, { $set: { ledgerEntryId: has._id } }); continue; }
    await creditView(ev, null);
    repairedCredits++;
  }

  // 2) Rebuild rollups from the truth and compare
  const [views, money] = await Promise.all([
    ViewEvent.aggregate<{ _id: { c: Types.ObjectId; p: Types.ObjectId; d: string }; pp: Types.ObjectId; eligible: number; ineligible: number; last: Date }>([
      { $match: scope },
      { $group: { _id: { c: '$creatorId', p: '$postId', d: '$istDay' }, pp: { $first: '$premiumPostId' },
        eligible: { $sum: { $cond: ['$eligible', 1, 0] } }, ineligible: { $sum: { $cond: ['$eligible', 0, 1] } }, last: { $max: { $cond: ['$eligible', '$occurredAt', null] } } } },
    ]),
    LedgerEntry.aggregate<{ _id: { c: Types.ObjectId; p: Types.ObjectId; d: string }; credited: number; reversed: number }>([
      { $match: { ...scope, type: { $in: ['view_credit', 'view_reversal'] } } },
      { $group: { _id: { c: '$creatorId', p: '$postId', d: '$istDay' },
        credited: { $sum: { $cond: [{ $eq: ['$type', 'view_credit'] }, '$amountPaise', 0] } },
        reversed: { $sum: { $cond: [{ $eq: ['$type', 'view_reversal'] }, { $multiply: ['$amountPaise', -1] }, 0] } } } },
    ]),
  ]);
  const key = (k: { c: Types.ObjectId; p: Types.ObjectId; d: string }) => `${k.c}|${k.p}|${k.d}`;
  const moneyMap = new Map(money.map((m) => [key(m._id), m]));
  let checked = 0; let fixed = 0;
  const mismatches: string[] = [];
  for (const v of views) {
    checked++;
    const m = moneyMap.get(key(v._id));
    const want = { eligibleViews: v.eligible, ineligibleViews: v.ineligible, creditedPaise: m?.credited ?? 0, reversedPaise: m?.reversed ?? 0 };
    const cur = await DailyEarning.findOne({ creatorId: v._id.c, postId: v._id.p, istDay: v._id.d }).lean();
    if (!cur || cur.eligibleViews !== want.eligibleViews || cur.ineligibleViews !== want.ineligibleViews || cur.creditedPaise !== want.creditedPaise || cur.reversedPaise !== want.reversedPaise) {
      mismatches.push(key(v._id));
      await DailyEarning.updateOne({ creatorId: v._id.c, postId: v._id.p, istDay: v._id.d },
        { $set: { ...want, premiumPostId: v.pp, lastViewAt: v.last ?? null } }, { upsert: true });
      fixed++;
    }
  }
  if (fixed || repairedCredits) console.warn(`[earnings] reconciliation fixed ${fixed} rollups and ${repairedCredits} missing credits`);
  return { since, checked, fixed, repairedCredits, mismatches: mismatches.slice(0, 50) };
}
