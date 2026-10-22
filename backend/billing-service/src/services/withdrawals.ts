import crypto from 'crypto';
import { Types } from 'mongoose';
import Withdrawal, { IWithdrawal, WithdrawalStatus, OPEN_STATUSES } from '../models/Withdrawal';
import PayoutMethod, { IPayoutMethod } from '../models/PayoutMethod';
import LedgerEntry from '../models/LedgerEntry';
import AuditLog from '../models/AuditLog';
import { seal, open, encryptionConfigured } from './secretBox';
import { validateDetails, mask, labelFor } from './payoutDetails';
import { balancesFromLedger, setWithdrawalSplit } from './earnings';
import { creatorStatus } from './creators';
import { withLock } from './lock';
import { maybeTransaction } from './tx';
import { istDay } from '../utils/ist';
import { AppError } from '../utils/errors';

export const MIN_WITHDRAWAL_PAISE = 10_000;     // ₹100
const MAX_METHODS = 3;

const oid = (id: string, what = 'id') => {
  if (!Types.ObjectId.isValid(id)) throw new AppError(400, `Invalid ${what}.`);
  return new Types.ObjectId(id);
};

// Balance states for withdrawals (plugs into the earnings balance calculation)
setWithdrawalSplit(async (creatorId) => {
  const rows = await Withdrawal.aggregate<{ _id: string; sum: number }>([
    { $match: { creatorId, status: { $in: [...OPEN_STATUSES, 'paid'] } } },
    { $group: { _id: { $cond: [{ $eq: ['$status', 'paid'] }, 'paid', 'open'] }, sum: { $sum: '$amountPaise' } } },
  ]);
  const m = Object.fromEntries(rows.map((r) => [r._id, r.sum])) as Record<string, number>;
  return { inWithdrawalPaise: m.open ?? 0, paidPaise: m.paid ?? 0 };
});

// ── Creator view helpers (masked only) ────────────────────────────────────────

export const methodView = (m: IPayoutMethod) => ({ id: m._id.toString(), type: m.type, label: m.label, masked: m.masked, createdAt: m.createdAt });

export const withdrawalView = (w: IWithdrawal) => ({
  id: w._id.toString(), amountPaise: w.amountPaise, status: w.status,
  method: { type: w.method.type, label: w.method.label, masked: w.method.masked },
  rejectionReason: w.rejectionReason, failureReason: w.failureReason, payoutReference: w.payoutReference, paidAt: w.paidAt,
  history: w.history.map((h) => ({ status: h.status, at: h.at, note: h.note, by: h.actorRole })),
  createdAt: w.createdAt,
});

// ── Payout methods ────────────────────────────────────────────────────────────

export async function listMethods(creatorId: string) {
  const items = await PayoutMethod.find({ creatorId: oid(creatorId), status: 'active' }).sort({ createdAt: -1 }).lean<IPayoutMethod[]>();
  return items.map(methodView);
}

export async function addMethod(creatorId: string, type: unknown, details: unknown) {
  const s = await creatorStatus(creatorId);
  if (!s.hasProfile) throw new AppError(403, 'Complete creator onboarding first.', 'NOT_A_CREATOR');
  const v = validateDetails(type, details);
  const sealed = seal(v.details);                 // throws 503 if no encryption key
  const cid = oid(creatorId);
  if (await PayoutMethod.countDocuments({ creatorId: cid, status: 'active' }) >= MAX_METHODS) throw new AppError(409, `You can save up to ${MAX_METHODS} payout methods. Remove one first.`);
  const masked = mask(v.type, v.details);
  const m = await PayoutMethod.create({ creatorId: cid, type: v.type, sealed, masked, label: labelFor(v.type, masked) });
  await AuditLog.create({ actorId: cid, actorRole: 'creator', action: 'payout_method.add', targetType: 'payout_method', targetId: m._id.toString(), details: { type: v.type, label: m.label } });
  return methodView(m.toObject());
}

export async function removeMethod(creatorId: string, methodId: string) {
  const r = await PayoutMethod.updateOne({ _id: oid(methodId), creatorId: oid(creatorId), status: 'active' }, { $set: { status: 'deleted' } });
  if (!r.modifiedCount) throw new AppError(404, 'Payout method not found.');
  await AuditLog.create({ actorId: oid(creatorId), actorRole: 'creator', action: 'payout_method.remove', targetType: 'payout_method', targetId: methodId, details: {} });
}

// ── Eligibility and request ───────────────────────────────────────────────────

/** Reasons a creator can't withdraw at all right now (independent of the amount). */
async function blockers(creatorId: string): Promise<string[]> {
  const [s, open] = await Promise.all([creatorStatus(creatorId), Withdrawal.exists({ creatorId: oid(creatorId), isOpen: true })]);
  const reasons: string[] = [];
  if (!encryptionConfigured()) reasons.push('Withdrawals are not available yet.');
  if (!s.hasProfile) reasons.push('Complete creator onboarding first.');
  else if (s.profileStatus === 'suspended') reasons.push('Your creator account is suspended.');
  if (!s.isCreatorPlan) reasons.push('Withdrawals need an active Creator Premium plan. Your balance is kept and you can withdraw after renewing.');
  if (open) reasons.push('You already have a withdrawal in progress.');
  return reasons;
}

export async function eligibility(creatorId: string) {
  const [reasons, b] = await Promise.all([blockers(creatorId), balancesFromLedger(creatorId)]);
  if (b.availablePaise < MIN_WITHDRAWAL_PAISE) reasons.push(`The minimum withdrawal is ₹${MIN_WITHDRAWAL_PAISE / 100}. Your available balance is ₹${(b.availablePaise / 100).toFixed(2)}.`);
  return { canWithdraw: reasons.length === 0, reasons, availablePaise: b.availablePaise, minPaise: MIN_WITHDRAWAL_PAISE, balances: b };
}

/**
 * Request a withdrawal. Serialised per creator (lock) and computed from the ledger itself, so two
 * requests can never spend the same money; the database also allows only one open request per creator.
 */
export async function requestWithdrawal(creatorId: string, input: { amountPaise?: unknown; payoutMethodId?: unknown; idempotencyKey?: unknown }) {
  const cid = oid(creatorId);
  const amount = Number(input.amountPaise);
  if (!Number.isInteger(amount) || amount <= 0) throw new AppError(400, 'amountPaise must be a whole number of paise.');
  if (amount < MIN_WITHDRAWAL_PAISE) throw new AppError(400, `The minimum withdrawal is ₹${MIN_WITHDRAWAL_PAISE / 100}.`, 'BELOW_MINIMUM');
  const key = typeof input.idempotencyKey === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(input.idempotencyKey) ? input.idempotencyKey : crypto.randomUUID();

  const again = await Withdrawal.findOne({ creatorId: cid, idempotencyKey: key }).lean<IWithdrawal>();
  if (again) return withdrawalView(again);

  const method = await PayoutMethod.findOne({ _id: oid(String(input.payoutMethodId ?? ''), 'payoutMethodId'), creatorId: cid, status: 'active' }).lean<IPayoutMethod>();
  if (!method) throw new AppError(404, 'Choose one of your saved payout methods.');
  if (method.type === 'amazon_gift_card' && amount % 100 !== 0) throw new AppError(400, 'Gift card amounts must be whole rupees.');

  return withLock(`creator:${creatorId}`, async () => {
    const dup = await Withdrawal.findOne({ creatorId: cid, idempotencyKey: key }).lean<IWithdrawal>();
    if (dup) return withdrawalView(dup);
    const reasons = await blockers(creatorId);
    if (reasons.length) throw new AppError(409, reasons[0], 'NOT_ELIGIBLE', { reasons });
    const { availablePaise } = await balancesFromLedger(creatorId);   // ledger truth, inside the lock
    if (amount > availablePaise) throw new AppError(409, `You can withdraw up to ₹${(Math.max(0, availablePaise) / 100).toFixed(2)}.`, 'INSUFFICIENT_BALANCE');

    try {
      const w = await maybeTransaction(async (s) => {
        const o = { session: s ?? undefined };
        const [created] = await Withdrawal.create([{
          creatorId: cid, amountPaise: amount, status: 'requested', isOpen: true, idempotencyKey: key,
          method: { type: method.type, payoutMethodId: method._id, masked: method.masked, label: method.label, sealed: method.sealed },
          history: [{ status: 'requested', at: new Date(), actorId: cid, actorRole: 'creator', note: null }],
        }], o);
        const [hold] = await LedgerEntry.create([{ creatorId: cid, type: 'withdrawal_hold', amountPaise: -amount, istDay: istDay(), withdrawalId: created._id }], o);
        created.holdEntryId = hold._id;
        await created.save(o);
        return created.toObject();
      });
      await AuditLog.create({ actorId: cid, actorRole: 'creator', action: 'withdrawal.request', targetType: 'withdrawal', targetId: w._id.toString(), details: { amountPaise: amount, method: method.label } });
      return withdrawalView(w);
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        const same = await Withdrawal.findOne({ creatorId: cid, idempotencyKey: key }).lean<IWithdrawal>();
        if (same) return withdrawalView(same);
        throw new AppError(409, 'You already have a withdrawal in progress.', 'NOT_ELIGIBLE');
      }
      throw err;
    }
  });
}

// ── State changes ─────────────────────────────────────────────────────────────

const RELEASE_ON: WithdrawalStatus[] = ['rejected', 'failed', 'cancelled'];
const ALLOWED: Record<WithdrawalStatus, WithdrawalStatus[]> = {
  requested:    ['under_review', 'rejected', 'cancelled'],
  under_review: ['approved', 'rejected', 'cancelled'],
  approved:     ['processing', 'rejected'],
  processing:   ['paid', 'failed'],
  paid: [], rejected: [], failed: [], cancelled: [],
};

/**
 * Move a withdrawal to a new status if (and only if) it is currently in `from`. Final states that
 * return money write exactly one release row (unique index); 'paid' keeps the hold as the payout.
 */
async function transition(w: IWithdrawal, to: WithdrawalStatus, actor: { id: string; role: 'creator' | 'admin' }, extra: Partial<Pick<IWithdrawal, 'rejectionReason' | 'failureReason' | 'payoutReference' | 'paidAt'>>, note: string | null) {
  if (!ALLOWED[w.status].includes(to)) throw new AppError(409, `A ${w.status.replace('_', ' ')} withdrawal cannot be marked ${to.replace('_', ' ')}.`, 'BAD_TRANSITION');
  const closing = !OPEN_STATUSES.includes(to);
  const updated = await maybeTransaction(async (s) => {
    const o = { session: s ?? undefined };
    const u = await Withdrawal.findOneAndUpdate(
      { _id: w._id, status: w.status },
      { $set: { status: to, ...(closing ? { isOpen: false } : {}), ...extra },
        $push: { history: { status: to, at: new Date(), actorId: new Types.ObjectId(actor.id), actorRole: actor.role, note } } },
      { new: true, ...o }
    );
    if (!u) return null;
    if (RELEASE_ON.includes(to)) {
      const [rel] = await LedgerEntry.create([{ creatorId: u.creatorId, type: 'withdrawal_release', amountPaise: u.amountPaise, istDay: istDay(), withdrawalId: u._id, reason: `Withdrawal ${to}` }], o);
      u.releaseEntryId = rel._id;
      await u.save(o);
    }
    return u.toObject();
  });
  if (!updated) throw new AppError(409, 'This withdrawal was changed by someone else. Reload and try again.', 'CONFLICT');
  await AuditLog.create({ actorId: new Types.ObjectId(actor.id), actorRole: actor.role, action: `withdrawal.${to}`, targetType: 'withdrawal', targetId: w._id.toString(),
    details: { from: w.status, amountPaise: w.amountPaise, note, payoutReference: extra.payoutReference ?? undefined } });
  return updated;
}

export async function cancelByCreator(creatorId: string, withdrawalId: string) {
  const w = await Withdrawal.findOne({ _id: oid(withdrawalId), creatorId: oid(creatorId) }).lean<IWithdrawal>();
  if (!w) throw new AppError(404, 'Withdrawal not found.');
  if (!['requested', 'under_review'].includes(w.status)) throw new AppError(409, 'This withdrawal can no longer be cancelled.', 'BAD_TRANSITION');
  return withdrawalView(await transition(w, 'cancelled', { id: creatorId, role: 'creator' }, {}, 'Cancelled by creator'));
}

export type AdminAction = 'review' | 'approve' | 'reject' | 'process' | 'paid' | 'failed';

export async function adminAction(adminId: string, withdrawalId: string, action: AdminAction, body: { reason?: string; payoutReference?: string; confirmFulfilled?: boolean; note?: string }) {
  const w = await Withdrawal.findById(oid(withdrawalId)).lean<IWithdrawal>();
  if (!w) throw new AppError(404, 'Withdrawal not found.');
  if (w.creatorId.toString() === adminId) throw new AppError(403, 'You cannot act on your own withdrawal.', 'SELF_PAYOUT');
  const actor = { id: adminId, role: 'admin' as const };
  const note = body.note?.trim()?.slice(0, 500) || null;

  switch (action) {
    case 'review':  return transition(w, 'under_review', actor, {}, note);
    case 'approve': return transition(w, 'approved', actor, {}, note);
    case 'process': return transition(w, 'processing', actor, {}, note);
    case 'reject': {
      const reason = String(body.reason ?? '').trim();
      if (reason.length < 5) throw new AppError(400, 'A reason is required to reject.');
      return transition(w, 'rejected', actor, { rejectionReason: reason.slice(0, 500) }, note);
    }
    case 'failed': {
      const reason = String(body.reason ?? '').trim();
      if (reason.length < 5) throw new AppError(400, 'Describe why the payout failed.');
      return transition(w, 'failed', actor, { failureReason: reason.slice(0, 500) }, note);
    }
    case 'paid': {
      // Never "paid" on intent alone: needs the external reference and an explicit confirmation
      const ref = String(body.payoutReference ?? '').trim();
      if (!/^[A-Za-z0-9 _\-/.#]{3,100}$/.test(ref)) throw new AppError(400, 'Enter the payment reference (UTR, UPI reference or gift card order id).');
      if (body.confirmFulfilled !== true) throw new AppError(400, 'Confirm that the money or gift card was actually delivered before marking it paid.', 'CONFIRM_FULFILMENT');
      return transition(w, 'paid', actor, { payoutReference: ref, paidAt: new Date() }, note);
    }
    default: throw new AppError(400, 'Unknown action.');
  }
}

/** Admin secure view: decrypts the destination. Every view is written to the audit log. */
export async function revealPayoutDetails(adminId: string, withdrawalId: string) {
  const w = await Withdrawal.findById(oid(withdrawalId)).lean<IWithdrawal>();
  if (!w) throw new AppError(404, 'Withdrawal not found.');
  if (!OPEN_STATUSES.includes(w.status)) throw new AppError(409, 'Payout details are only shown for open withdrawals.');
  const details = open(w.method.sealed);
  await AuditLog.create({ actorId: new Types.ObjectId(adminId), actorRole: 'admin', action: 'withdrawal.details_viewed', targetType: 'withdrawal', targetId: withdrawalId, details: { method: w.method.label } });
  return { type: w.method.type, details };
}

// ── Lists, export, reconciliation ─────────────────────────────────────────────

export async function listForCreator(creatorId: string, skip: number, limit: number) {
  const f = { creatorId: oid(creatorId) };
  const [items, total] = await Promise.all([Withdrawal.find(f).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IWithdrawal[]>(), Withdrawal.countDocuments(f)]);
  return { items: items.map(withdrawalView), total };
}

export async function getForCreator(creatorId: string, id: string) {
  const w = await Withdrawal.findOne({ _id: oid(id), creatorId: oid(creatorId) }).lean<IWithdrawal>();
  if (!w) throw new AppError(404, 'Withdrawal not found.');
  return withdrawalView(w);
}

export async function adminList(q: { status?: string; creatorId?: string; skip: number; limit: number }) {
  const f: Record<string, unknown> = {};
  if (q.status === 'open') f.isOpen = true;
  else if (q.status) f.status = q.status;
  if (q.creatorId) f.creatorId = oid(q.creatorId, 'creatorId');
  const [items, total] = await Promise.all([Withdrawal.find(f).sort({ createdAt: 1 }).skip(q.skip).limit(q.limit).lean<IWithdrawal[]>(), Withdrawal.countDocuments(f)]);
  return { items: items.map((w) => ({ ...withdrawalView(w), creatorId: w.creatorId.toString() })), total };
}

export async function adminDetail(id: string) {
  const w = await Withdrawal.findById(oid(id)).lean<IWithdrawal>();
  if (!w) throw new AppError(404, 'Withdrawal not found.');
  const [balances, previous] = await Promise.all([
    balancesFromLedger(w.creatorId.toString()),
    Withdrawal.find({ creatorId: w.creatorId, _id: { $ne: w._id } }).sort({ createdAt: -1 }).limit(20).lean<IWithdrawal[]>(),
  ]);
  return { withdrawal: { ...withdrawalView(w), creatorId: w.creatorId.toString() }, creatorBalances: balances, previousWithdrawals: previous.map(withdrawalView) };
}

const csvCell = (v: unknown) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;                    // stop spreadsheet formula injection
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV of withdrawals with masked destinations only. */
export async function exportCsv(adminId: string, q: { status?: string; from?: string; to?: string }): Promise<string> {
  const f: Record<string, unknown> = {};
  if (q.status === 'open') f.isOpen = true; else if (q.status) f.status = q.status;
  const range: Record<string, Date> = {};
  if (q.from && !isNaN(Date.parse(q.from))) range.$gte = new Date(q.from);
  if (q.to && !isNaN(Date.parse(q.to))) range.$lte = new Date(Date.parse(q.to) + 86_399_999);
  if (Object.keys(range).length) f.createdAt = range;
  const rows = await Withdrawal.find(f).sort({ createdAt: 1 }).limit(50_000).lean<IWithdrawal[]>();
  await AuditLog.create({ actorId: new Types.ObjectId(adminId), actorRole: 'admin', action: 'withdrawal.export', targetType: 'withdrawals', targetId: `${rows.length} rows`, details: q });
  const header = ['withdrawal_id', 'requested_at', 'creator_id', 'amount_inr', 'method', 'destination_masked', 'status', 'payout_reference', 'paid_at', 'rejection_or_failure_reason'];
  const lines = rows.map((w) => [
    w._id, w.createdAt.toISOString(), w.creatorId, (w.amountPaise / 100).toFixed(2), w.method.type, w.method.label, w.status,
    w.payoutReference ?? '', w.paidAt?.toISOString() ?? '', w.rejectionReason ?? w.failureReason ?? '',
  ].map(csvCell).join(','));
  return [header.join(','), ...lines].join('\n') + '\n';
}

/** Every withdrawal has its hold; closed-without-payment ones have exactly one release; nothing else does. */
export async function reconcileWithdrawals() {
  const problems: string[] = [];
  const all = await Withdrawal.find({}).select('_id status amountPaise').lean<IWithdrawal[]>();
  const entries = await LedgerEntry.find({ type: { $in: ['withdrawal_hold', 'withdrawal_release'] } }).select('withdrawalId type amountPaise').lean();
  const byW = new Map<string, { hold?: number; release?: number }>();
  for (const e of entries) {
    const k = String(e.withdrawalId);
    const cur = byW.get(k) ?? {};
    if (e.type === 'withdrawal_hold') cur.hold = e.amountPaise; else cur.release = e.amountPaise;
    byW.set(k, cur);
  }
  for (const w of all) {
    const e = byW.get(w._id.toString()) ?? {};
    if (e.hold !== -w.amountPaise) problems.push(`${w._id}: hold missing or wrong`);
    const shouldRelease = RELEASE_ON.includes(w.status);
    if (shouldRelease && e.release !== w.amountPaise) problems.push(`${w._id}: ${w.status} but not released`);
    if (!shouldRelease && e.release !== undefined) problems.push(`${w._id}: ${w.status} but released`);
  }
  if (problems.length) console.error('[withdrawals] reconciliation problems:', problems.slice(0, 20));
  return { checked: all.length, problems };
}
