import { Types } from 'mongoose';
import { Violation, CreatorRestriction, CreatorStanding, IViolation, ViolationConsequence, VIOLATION_CATEGORIES } from '../models/Violation';
import ReviewAction from '../models/ReviewAction';
import { queueEmail, siteUrl } from './emailOutbox';
import { AppError } from '../utils/errors';

// ── Policy ─────────────────────────────────────────────────────────────────────
// Only violations a reviewer CONFIRMS count. 1st → Warning 1, 2nd → Warning 2,
// 3rd and every later one → 30 days without premium submissions (stacking after any current block).
// Violations never expire. An admin/reviewer can overturn one (with a reason, logged): it stops
// counting and any block it caused is lifted. Nothing is ever deleted or reset silently.
export const RESTRICTION_DAYS = 30;
const DAY = 86_400_000;

export function consequenceFor(n: number): ViolationConsequence {
  return n <= 1 ? 'warning_1' : n === 2 ? 'warning_2' : 'restriction_30d';
}

export function consequenceText(c: ViolationConsequence, until?: Date | null): string {
  if (c === 'warning_1') return 'This is a confirmed policy violation: Warning 1 of 2. A third confirmed violation blocks premium submissions for 30 days.';
  if (c === 'warning_2') return 'This is a confirmed policy violation: Warning 2 of 2. One more confirmed violation blocks premium submissions for 30 days.';
  return `This is your third or later confirmed policy violation. You cannot submit premium posts until ${until ? until.toDateString() : 'the block ends'}.`;
}

export interface ConfirmInput {
  creatorId: Types.ObjectId; premiumPostId: Types.ObjectId; revisionId: Types.ObjectId; postTitle: string;
  category: string; reason: string; confirmedBy: Types.ObjectId; actorRole: 'reviewer' | 'admin';
}

export function assertCategory(c: unknown): asserts c is typeof VIOLATION_CATEGORIES[number] {
  if (!VIOLATION_CATEGORIES.includes(c as typeof VIOLATION_CATEGORIES[number])) {
    throw new AppError(400, `violationCategory must be one of: ${VIOLATION_CATEGORIES.join(', ')}.`);
  }
}

/** Record a reviewer-confirmed violation and apply its consequence. Idempotent per revision. */
export async function confirmViolation(input: ConfirmInput): Promise<IViolation> {
  assertCategory(input.category);
  const existing = await Violation.findOne({ revisionId: input.revisionId }).lean<IViolation>();
  if (existing) return existing;

  // Atomic sequence number per creator
  const standing = await CreatorStanding.findOneAndUpdate(
    { creatorId: input.creatorId }, { $inc: { confirmedCount: 1 } }, { upsert: true, new: true }
  );
  const sequence = standing.confirmedCount;
  const consequence = consequenceFor(sequence);
  const now = new Date();

  let v;
  try {
    v = await Violation.create({
      creatorId: input.creatorId, premiumPostId: input.premiumPostId, revisionId: input.revisionId, postTitle: input.postTitle,
      category: input.category, reason: input.reason, confirmedBy: input.confirmedBy, confirmedAt: now, sequence, consequence,
    });
  } catch (err) {
    await CreatorStanding.updateOne({ creatorId: input.creatorId }, { $inc: { confirmedCount: -1 } });
    if ((err as { code?: number }).code === 11000) return (await Violation.findOne({ revisionId: input.revisionId }).lean<IViolation>())!;
    throw err;
  }

  if (consequence === 'restriction_30d') {
    // Stack after any block still running
    const updated = await CreatorStanding.findOneAndUpdate(
      { creatorId: input.creatorId },
      [{ $set: { restrictedUntil: { $add: [{ $max: [now, { $ifNull: ['$restrictedUntil', now] }] }, RESTRICTION_DAYS * DAY] } } }],
      { new: true }
    );
    const endsAt = updated!.restrictedUntil!;
    const r = await CreatorRestriction.create({ creatorId: input.creatorId, violationId: v._id, startsAt: new Date(endsAt.getTime() - RESTRICTION_DAYS * DAY), endsAt });
    v.restrictionId = r._id;
    await v.save();
  }

  await ReviewAction.create({ revisionId: input.revisionId, premiumPostId: input.premiumPostId, creatorId: input.creatorId, actorId: input.confirmedBy,
    actorRole: input.actorRole, action: 'violation_confirmed', details: { violationId: v._id.toString(), sequence, consequence, category: input.category } });
  return v.toObject();
}

/**
 * After an overturn: re-chain the remaining blocks (each 30 days, starting when it was imposed or
 * when the previous one ends) so lifting an earlier block moves later ones up, then refresh the cache.
 */
async function recomputeStanding(creatorId: Types.ObjectId): Promise<void> {
  const remaining = await CreatorRestriction.find({ creatorId, status: 'active' }).sort({ createdAt: 1 });
  let cursor: number | null = null;
  for (const r of remaining) {
    const start = Math.max(r.createdAt.getTime(), cursor ?? 0);
    const end = start + RESTRICTION_DAYS * DAY;
    if (r.startsAt.getTime() !== start || r.endsAt.getTime() !== end) {
      r.startsAt = new Date(start);
      r.endsAt = new Date(end);
      await r.save();
    }
    cursor = end;
  }
  const count = await Violation.countDocuments({ creatorId, status: 'confirmed' });
  await CreatorStanding.updateOne({ creatorId }, { $set: { confirmedCount: count, restrictedUntil: cursor ? new Date(cursor) : null } }, { upsert: true });
}

/** When premium submissions are blocked until, or null. Read from the restriction records. */
export async function activeRestriction(creatorId: string | Types.ObjectId): Promise<Date | null> {
  const r = await CreatorRestriction.findOne({ creatorId: new Types.ObjectId(String(creatorId)), status: 'active', endsAt: { $gt: new Date() } })
    .sort({ endsAt: -1 }).lean();
  return r?.endsAt ?? null;
}

export async function assertNotRestricted(creatorId: string): Promise<void> {
  const until = await activeRestriction(creatorId);
  if (until) {
    throw new AppError(403, `Premium submissions are blocked until ${until.toDateString()} because of repeated confirmed policy violations.`, 'CREATOR_RESTRICTED', { restrictedUntil: until });
  }
}

/** Overturn a violation (mistake or successful appeal). Logged; the record stays. */
export async function overturnViolation(actor: { id: string; role: 'reviewer' | 'admin' }, violationId: string, reason: string, viaAppeal = false): Promise<IViolation> {
  if (!Types.ObjectId.isValid(violationId)) throw new AppError(400, 'Invalid id.');
  if (!reason?.trim() || reason.trim().length < 5) throw new AppError(400, 'A reason is required.');
  const v = await Violation.findById(violationId);
  if (!v) throw new AppError(404, 'Violation not found.');
  if (actor.role !== 'admin' && v.confirmedBy.toString() === actor.id) throw new AppError(403, 'Another reviewer or an admin must review your own decision.');

  const updated = await Violation.findOneAndUpdate(
    { _id: v._id, status: 'confirmed' },
    { $set: { status: 'overturned', overturnedBy: new Types.ObjectId(actor.id), overturnedAt: new Date(), overturnReason: reason.trim(),
      ...(viaAppeal ? { 'appeal.status': 'overturned', 'appeal.decidedBy': new Types.ObjectId(actor.id), 'appeal.decidedAt': new Date(), 'appeal.note': reason.trim() } : {}) } },
    { new: true }
  );
  if (!updated) throw new AppError(409, 'This violation was already overturned.');
  if (updated.restrictionId) {
    await CreatorRestriction.updateOne({ _id: updated.restrictionId, status: 'active' },
      { $set: { status: 'lifted', liftedBy: new Types.ObjectId(actor.id), liftedAt: new Date(), liftReason: reason.trim() } });
  }
  await recomputeStanding(updated.creatorId);
  await ReviewAction.create({ revisionId: updated.revisionId, premiumPostId: updated.premiumPostId, creatorId: updated.creatorId, actorId: new Types.ObjectId(actor.id),
    actorRole: actor.role, action: viaAppeal ? 'appeal_overturned' : 'violation_overturned', note: reason.trim(), details: { violationId } });
  await queueEmail('violation_updated', { userId: updated.creatorId }, {
    message: `A policy violation on "${updated.postTitle}" was overturned and no longer counts against you.${updated.restrictionId ? ' The submission block it caused has been lifted.' : ''}`,
    dashboardUrl: siteUrl('/creator'),
  }, `violation-overturned:${violationId}`);
  return updated.toObject();
}

/** Creator appeals a confirmed violation (once). */
export async function submitAppeal(creatorId: string, violationId: string, text: string): Promise<IViolation> {
  if (!Types.ObjectId.isValid(violationId)) throw new AppError(400, 'Invalid id.');
  const t = String(text ?? '').trim();
  if (t.length < 20 || t.length > 2000) throw new AppError(400, 'Explain your appeal in 20–2000 characters.');
  const v = await Violation.findOneAndUpdate(
    { _id: violationId, creatorId: new Types.ObjectId(creatorId), status: 'confirmed', 'appeal.status': 'none' },
    { $set: { 'appeal.status': 'pending', 'appeal.text': t, 'appeal.submittedAt': new Date() } },
    { new: true }
  );
  if (!v) throw new AppError(409, 'This violation cannot be appealed (not found, already appealed or already overturned).');
  await ReviewAction.create({ revisionId: v.revisionId, premiumPostId: v.premiumPostId, creatorId: v.creatorId, actorId: v.creatorId, actorRole: 'creator', action: 'appeal_submitted', details: { violationId } });
  return v.toObject();
}

/** Decide an appeal: overturn (violation stops counting) or uphold (stays). */
export async function decideAppeal(actor: { id: string; role: 'reviewer' | 'admin' }, violationId: string, decision: 'uphold' | 'overturn', note: string): Promise<IViolation> {
  const v = await Violation.findById(violationId).lean<IViolation>();
  if (!v || v.appeal.status !== 'pending') throw new AppError(409, 'No pending appeal for this violation.');
  if (decision === 'overturn') return overturnViolation(actor, violationId, note, true);
  if (!note?.trim()) throw new AppError(400, 'A note is required.');
  if (actor.role !== 'admin' && v.confirmedBy.toString() === actor.id) throw new AppError(403, 'Another reviewer or an admin must decide an appeal on your own decision.');
  const upheld = await Violation.findOneAndUpdate(
    { _id: v._id, 'appeal.status': 'pending' },
    { $set: { 'appeal.status': 'upheld', 'appeal.decidedBy': new Types.ObjectId(actor.id), 'appeal.decidedAt': new Date(), 'appeal.note': note.trim() } },
    { new: true }
  );
  if (!upheld) throw new AppError(409, 'No pending appeal for this violation.');
  await ReviewAction.create({ revisionId: v.revisionId, premiumPostId: v.premiumPostId, creatorId: v.creatorId, actorId: new Types.ObjectId(actor.id), actorRole: actor.role, action: 'appeal_upheld', note: note.trim(), details: { violationId } });
  await queueEmail('violation_updated', { userId: v.creatorId }, {
    message: `Your appeal about "${v.postTitle}" was reviewed and the violation stands. Note from the reviewer: ${note.trim()}`,
    dashboardUrl: siteUrl('/creator'),
  }, `appeal-upheld:${violationId}`);
  return upheld.toObject();
}

/** What a creator sees about their own standing (no reviewer identities or internal notes). */
export async function creatorStanding(creatorId: string) {
  const cid = new Types.ObjectId(creatorId);
  const [violations, until] = await Promise.all([
    Violation.find({ creatorId: cid }).sort({ confirmedAt: -1 }).lean<IViolation[]>(),
    activeRestriction(cid),
  ]);
  const confirmed = violations.filter((v) => v.status === 'confirmed').length;
  return {
    confirmedViolations: confirmed,
    level: confirmed === 0 ? 'good' : confirmed === 1 ? 'warning_1' : confirmed === 2 ? 'warning_2' : 'restricted_on_next',
    restriction: until ? { active: true, until } : { active: false, until: null },
    policy: 'Confirmed violations do not expire. 1st = Warning 1, 2nd = Warning 2, 3rd and later = 30 days without premium submissions. You can appeal each violation once.',
    violations: violations.map((v) => ({
      id: v._id.toString(), postTitle: v.postTitle, category: v.category, reason: v.reason, confirmedAt: v.confirmedAt,
      consequence: v.consequence, status: v.status, overturnReason: v.overturnReason,
      appeal: { status: v.appeal.status, submittedAt: v.appeal.submittedAt, decidedAt: v.appeal.decidedAt, note: v.appeal.status === 'upheld' ? v.appeal.note : null },
    })),
  };
}
