import { Types } from 'mongoose';
import User from '../models/User';
import Post from '../models/Post';
import PremiumPost from '../models/PremiumPost';
import PremiumPostRevision, { IPremiumPostRevision } from '../models/PremiumPostRevision';
import ValidationResult, { IValidationResult } from '../models/ValidationResult';
import ReviewAction from '../models/ReviewAction';
import { Violation, IViolation } from '../models/Violation';
import { screenRevision, screeningSummary } from './screening';
import { confirmViolation, consequenceText, activeRestriction, assertCategory } from './violations';
import { queueEmail, siteUrl } from './emailOutbox';
import { maybeTransaction, opts } from './tx';
import { generateSlug, uniqueSlug } from '../utils/slug';
import { notifyIndexNow } from '../controllers/seoController';
import { AppError } from '../utils/errors';

export type StaffRole = 'reviewer' | 'admin';
export interface Staff { id: string; role: StaffRole }

const oid = (id: string) => {
  if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'Invalid id.');
  return new Types.ObjectId(id);
};

/** Reviewer/admin check against the database (a revoked role stops working immediately). */
export async function requireStaff(userId: string): Promise<Staff> {
  const u = await User.findById(userId).select('role isActive').lean();
  if (!u || u.isActive === false || (u.role !== 'reviewer' && u.role !== 'admin')) {
    throw new AppError(403, 'Only content reviewers and admins can do this.', 'NOT_REVIEWER');
  }
  return { id: userId, role: u.role as StaffRole };
}

export async function requireAdmin(userId: string): Promise<Staff> {
  const s = await requireStaff(userId);
  if (s.role !== 'admin') throw new AppError(403, 'Only admins can do this.', 'NOT_ADMIN');
  return s;
}

// ── Assignment ─────────────────────────────────────────────────────────────────

/** Active reviewer with the fewest open reviews (never the creator). Falls back to admins. */
async function pickReviewer(excludeId: Types.ObjectId): Promise<Types.ObjectId | null> {
  for (const role of ['reviewer', 'admin']) {
    const staff = await User.find({ role, isActive: { $ne: false }, _id: { $ne: excludeId } }).select('_id').lean();
    if (!staff.length) continue;
    const loads = await PremiumPostRevision.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $match: { status: 'in_review', assignedReviewerId: { $in: staff.map((s) => s._id) } } },
      { $group: { _id: '$assignedReviewerId', n: { $sum: 1 } } },
    ]);
    const load = new Map(loads.map((l) => [l._id.toString(), l.n]));
    staff.sort((a, b) => (load.get(a._id.toString()) ?? 0) - (load.get(b._id.toString()) ?? 0));
    return staff[0]._id;
  }
  return null;
}

async function notifyAssigned(rev: IPremiumPostRevision, reviewerId: Types.ObjectId | null, v: IValidationResult | null): Promise<void> {
  const data = { title: rev.title, creatorName: rev.author.name, version: rev.version, screeningSummary: screeningSummary(v), reviewUrl: siteUrl(`/review/${rev._id}`) };
  if (reviewerId) await queueEmail('reviewer_assigned', { userId: reviewerId }, data, `assigned:${rev._id}:${reviewerId}`);
  else if (process.env.PREMIUM_REVIEW_EMAIL_FALLBACK) await queueEmail('reviewer_assigned', { email: process.env.PREMIUM_REVIEW_EMAIL_FALLBACK }, data, `assigned:${rev._id}:fallback`);
  else console.warn(`[moderation] no reviewer or admin to assign revision ${rev._id}; set PREMIUM_REVIEW_EMAIL_FALLBACK or add a reviewer`);
}

/**
 * After submit: screen (advice only), then put it in a reviewer's queue and email them.
 * Safe to call repeatedly — the sweeper job re-runs it for anything left half-done.
 */
export async function processSubmission(revisionId: Types.ObjectId): Promise<void> {
  let v: IValidationResult | null = null;
  try {
    const had = await ValidationResult.exists({ revisionId });
    v = await screenRevision(revisionId.toString());
    if (!had) {
      await ReviewAction.create({ revisionId, premiumPostId: v.premiumPostId, creatorId: v.creatorId, actorRole: 'system', action: 'screened',
        details: { status: v.status, errorCode: v.errorCode, recommended: v.output?.recommended_action ?? null, flags: v.heuristics.flags } });
    }
  } catch (err) {
    console.error('[moderation] screening crashed (post still goes to a reviewer):', (err as Error).message);
  }

  const rev = await PremiumPostRevision.findOne({ _id: revisionId, status: 'in_review', assignedReviewerId: null }).lean<IPremiumPostRevision>();
  if (!rev) return;
  const reviewerId = await pickReviewer(rev.creatorId);
  if (reviewerId) {
    const r = await PremiumPostRevision.updateOne({ _id: rev._id, status: 'in_review', assignedReviewerId: null }, { $set: { assignedReviewerId: reviewerId, assignedAt: new Date() } });
    if (!r.modifiedCount) return; // someone else assigned it meanwhile
    await ReviewAction.create({ revisionId: rev._id, premiumPostId: rev.premiumPostId, creatorId: rev.creatorId, actorRole: 'system', action: 'assigned', details: { reviewerId: reviewerId.toString() } });
  }
  await notifyAssigned(rev, reviewerId, v);
}

/** Admin moves a review to another reviewer. */
export async function reassign(actor: Staff, revisionId: string, reviewerId: string): Promise<void> {
  if (actor.role !== 'admin') throw new AppError(403, 'Only admins can reassign reviews.');
  const target = await User.findById(oid(reviewerId)).select('role isActive').lean();
  if (!target || target.isActive === false || !['reviewer', 'admin'].includes(target.role)) throw new AppError(400, 'Choose an active reviewer.');
  const rev = await PremiumPostRevision.findOne({ _id: oid(revisionId), status: 'in_review' }).lean<IPremiumPostRevision>();
  if (!rev) throw new AppError(404, 'No open review with that id.');
  if (rev.creatorId.toString() === reviewerId) throw new AppError(400, 'Creators cannot review their own posts.');
  await PremiumPostRevision.updateOne({ _id: rev._id }, { $set: { assignedReviewerId: oid(reviewerId), assignedAt: new Date() } });
  await ReviewAction.create({ revisionId: rev._id, premiumPostId: rev.premiumPostId, creatorId: rev.creatorId, actorId: oid(actor.id), actorRole: 'admin', action: 'reassigned',
    details: { from: rev.assignedReviewerId?.toString() ?? null, to: reviewerId } });
  const v = await ValidationResult.findOne({ revisionId: rev._id }).lean<IValidationResult>();
  await notifyAssigned(rev, oid(reviewerId), v);
}

// ── Decisions ──────────────────────────────────────────────────────────────────

async function loadOpenRevision(actor: Staff, revisionId: string): Promise<IPremiumPostRevision> {
  const rev = await PremiumPostRevision.findById(oid(revisionId)).lean<IPremiumPostRevision>();
  if (!rev) throw new AppError(404, 'Review not found.');
  if (rev.creatorId.toString() === actor.id) throw new AppError(403, 'You cannot review your own post.', 'SELF_REVIEW');
  if (rev.status !== 'in_review') throw new AppError(409, `This submission is already ${rev.status}.`, 'ALREADY_DECIDED');
  return rev;
}

/** Copy an approved revision into the public Post (create it the first time). Idempotent. */
export async function publishRevision(rev: IPremiumPostRevision): Promise<{ slug: string | null; isLive: boolean }> {
  return maybeTransaction(async (session) => {
    const pp = await PremiumPost.findById(rev.premiumPostId).session(session);
    if (!pp) throw new AppError(404, 'Post not found.');
    if (pp.liveRevisionId?.equals(rev._id)) {
      const p = await Post.findById(pp.publicPostId).select('slug isActive').session(session).lean();
      return { slug: p?.slug ?? null, isLive: !!p?.isActive };
    }
    const metaDescription = rev.plainText.replace(/\s+/g, ' ').slice(0, 155);
    const fields = {
      title: rev.title, content: rev.content, image: rev.coverImage, images: [rev.coverImage, ...rev.images],
      topic: rev.topic, subTopic: rev.subTopic, isAiImage: rev.isAiImage, isPremium: true, approvalStatus: 'approved' as const,
      'author.name': rev.author.name, 'author.username': rev.author.username, 'author.avatar': rev.author.avatar,
      premium: { premiumPostId: pp._id, revisionId: rev._id, version: rev.version, tags: rev.tags, approvedAt: new Date() },
      seo: { metaTitle: rev.title.slice(0, 70), metaDescription, keywords: rev.tags, ogTitle: rev.title.slice(0, 90), ogDescription: metaDescription.slice(0, 200), ogImage: rev.coverImage, canonical: null },
    };

    let postId = pp.publicPostId;
    let slug: string | null;
    if (postId) {
      // Edit of a live post: the new version replaces the old only now; likes/comments/slug stay
      const updated = await Post.findByIdAndUpdate(postId, { $set: fields }, { new: true, ...opts(session) });
      slug = updated?.slug ?? null;
    } else {
      slug = await uniqueSlug(generateSlug(rev.title) || `premium-${rev._id}`);
      const [created] = await Post.create([{
        ...Object.fromEntries(Object.entries(fields).filter(([k]) => !k.startsWith('author.'))),
        author: { userId: rev.creatorId, name: rev.author.name, username: rev.author.username, avatar: rev.author.avatar },
        userType: 'user', slug, timezone: 'Asia/Kolkata', isActive: true,
      }], opts(session));
      postId = created._id;
    }

    if (pp.liveRevisionId) {
      await PremiumPostRevision.updateOne({ _id: pp.liveRevisionId, status: 'approved' }, { $set: { status: 'superseded' } }, opts(session));
    }
    const firstPublish = pp.status === 'draft';
    pp.publicPostId = postId;
    pp.liveRevisionId = rev._id;
    pp.reviewState = 'approved';
    pp.lastRejectionReason = null;
    if (firstPublish) { pp.status = 'published'; pp.publishedAt = new Date(); }
    await pp.save({ session: session ?? undefined });
    // A creator who unpublished keeps it unpublished; the approved content is ready when they republish
    const isLive = pp.status === 'published';
    if (!isLive) await Post.updateOne({ _id: postId }, { $set: { isActive: false } }, opts(session));
    return { slug, isLive };
  });
}

export async function approve(actor: Staff, revisionId: string, note?: string) {
  const rev = await loadOpenRevision(actor, revisionId);
  const decided = await PremiumPostRevision.findOneAndUpdate(
    { _id: rev._id, status: 'in_review' },
    { $set: { status: 'approved', decidedAt: new Date(), decidedBy: oid(actor.id), decisionReason: null } },
    { new: true }
  ).lean<IPremiumPostRevision>();
  if (!decided) throw new AppError(409, 'Someone else already decided this submission.', 'ALREADY_DECIDED');

  const { slug, isLive } = await publishRevision(decided);
  await ReviewAction.create({ revisionId: rev._id, premiumPostId: rev.premiumPostId, creatorId: rev.creatorId, actorId: oid(actor.id), actorRole: actor.role,
    action: 'approved', note: note?.trim() || null, details: { version: rev.version } });
  if (isLive && slug) notifyIndexNow(slug).catch(() => undefined);
  await queueEmail('post_approved', { userId: rev.creatorId }, { title: rev.title, postUrl: slug ? siteUrl(`/posts/${slug}`) : siteUrl('/creator') }, `approved:${rev._id}`);
  return { revisionId: rev._id.toString(), status: 'approved', slug, isLive };
}

export interface RejectInput { reason?: string; violation?: boolean; violationCategory?: string; note?: string }

export async function reject(actor: Staff, revisionId: string, input: RejectInput) {
  const reason = String(input.reason ?? '').trim();
  if (reason.length < 10 || reason.length > 1000) throw new AppError(400, 'Give the creator a clear reason (10–1000 characters).');
  if (input.violation) assertCategory(input.violationCategory);
  const rev = await loadOpenRevision(actor, revisionId);

  const decided = await PremiumPostRevision.findOneAndUpdate(
    { _id: rev._id, status: 'in_review' },
    { $set: { status: 'rejected', decidedAt: new Date(), decidedBy: oid(actor.id), decisionReason: reason } },
    { new: true }
  ).lean<IPremiumPostRevision>();
  if (!decided) throw new AppError(409, 'Someone else already decided this submission.', 'ALREADY_DECIDED');

  const pp = await PremiumPost.findByIdAndUpdate(rev.premiumPostId, { $set: { reviewState: 'rejected', lastRejectionReason: reason } }, { new: true });
  await ReviewAction.create({ revisionId: rev._id, premiumPostId: rev.premiumPostId, creatorId: rev.creatorId, actorId: oid(actor.id), actorRole: actor.role,
    action: 'rejected', note: input.note?.trim() || null, details: { version: rev.version, reason, violation: !!input.violation } });

  let violation: IViolation | null = null;
  if (input.violation) {
    violation = await confirmViolation({
      creatorId: rev.creatorId, premiumPostId: rev.premiumPostId, revisionId: rev._id, postTitle: rev.title,
      category: input.violationCategory!, reason, confirmedBy: oid(actor.id), actorRole: actor.role,
    });
    await PremiumPostRevision.updateOne({ _id: rev._id }, { $set: { violationId: violation._id } });
  }
  const until = violation ? await activeRestriction(rev.creatorId) : null;
  await queueEmail('post_rejected', { userId: rev.creatorId }, {
    title: rev.title, reason, wasLive: pp?.status === 'published',
    violationNotice: violation ? consequenceText(violation.consequence, until) : null,
    dashboardUrl: siteUrl(`/creator/posts/${rev.premiumPostId}`),
  }, `rejected:${rev._id}`);
  return { revisionId: rev._id.toString(), status: 'rejected', violation: violation ? { id: violation._id.toString(), sequence: violation.sequence, consequence: violation.consequence } : null };
}

export async function addNote(actor: Staff, revisionId: string, note: string) {
  const n = String(note ?? '').trim();
  if (!n || n.length > 2000) throw new AppError(400, 'Notes must be 1–2000 characters.');
  const rev = await PremiumPostRevision.findById(oid(revisionId)).select('premiumPostId creatorId').lean();
  if (!rev) throw new AppError(404, 'Review not found.');
  await ReviewAction.create({ revisionId: rev._id, premiumPostId: rev.premiumPostId, creatorId: rev.creatorId, actorId: oid(actor.id), actorRole: actor.role, action: 'note', note: n });
}

// ── Reads ──────────────────────────────────────────────────────────────────────

export async function queue(actor: Staff, q: { status?: string; mine?: boolean; skip: number; limit: number }) {
  const status = ({ pending: 'in_review', approved: 'approved', rejected: 'rejected' } as Record<string, string>)[q.status ?? 'pending'] ?? 'in_review';
  const filter: Record<string, unknown> = { status: status === 'approved' ? { $in: ['approved', 'superseded'] } : status };
  if (q.mine) filter.assignedReviewerId = oid(actor.id);
  const [items, total] = await Promise.all([
    PremiumPostRevision.find(filter).sort(status === 'in_review' ? { submittedAt: 1 } : { decidedAt: -1 }).skip(q.skip).limit(q.limit)
      .select('-content -plainText').lean<IPremiumPostRevision[]>(),
    PremiumPostRevision.countDocuments(filter),
  ]);
  const vs = await ValidationResult.find({ revisionId: { $in: items.map((i) => i._id) } }).lean<IValidationResult[]>();
  const vmap = new Map(vs.map((v) => [v.revisionId.toString(), v]));
  return {
    total,
    items: items.map((r) => {
      const v = vmap.get(r._id.toString()) ?? null;
      return {
        id: r._id.toString(), premiumPostId: r.premiumPostId.toString(), version: r.version, title: r.title, coverImage: r.coverImage,
        topic: r.topic, subTopic: r.subTopic, wordCount: r.wordCount, creator: { id: r.creatorId.toString(), ...r.author },
        status: r.status, submittedAt: r.submittedAt, decidedAt: r.decidedAt, assignedReviewerId: r.assignedReviewerId?.toString() ?? null,
        isEdit: r.version > 1, screening: { status: v?.status ?? 'pending', recommended: v?.output?.recommended_action ?? null, flags: v?.heuristics?.flags ?? [], summary: screeningSummary(v) },
      };
    }),
  };
}

export async function detail(actor: Staff, revisionId: string) {
  void actor;
  const rev = await PremiumPostRevision.findById(oid(revisionId)).lean<IPremiumPostRevision>();
  if (!rev) throw new AppError(404, 'Review not found.');
  const [validation, history, pp, creatorUser, violations, counts, until] = await Promise.all([
    ValidationResult.findOne({ revisionId: rev._id }).lean<IValidationResult>(),
    ReviewAction.find({ $or: [{ revisionId: rev._id }, { premiumPostId: rev.premiumPostId }] }).sort({ createdAt: 1 }).lean(),
    PremiumPost.findById(rev.premiumPostId).select('status liveRevisionId publicPostId').lean(),
    User.findById(rev.creatorId).select('name username avatar createdAt').lean(),
    Violation.find({ creatorId: rev.creatorId }).sort({ confirmedAt: -1 }).lean<IViolation[]>(),
    PremiumPostRevision.aggregate<{ _id: string; n: number }>([{ $match: { creatorId: rev.creatorId } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    activeRestriction(rev.creatorId),
  ]);
  const live = pp?.liveRevisionId && !pp.liveRevisionId.equals(rev._id)
    ? await PremiumPostRevision.findById(pp.liveRevisionId).select('version title content coverImage tags topic subTopic').lean()
    : null;
  return {
    revision: rev,
    liveVersion: live,                     // for comparing an edit with what is live now
    screening: validation ? { status: validation.status, errorCode: validation.errorCode, output: validation.output, heuristics: validation.heuristics, summary: screeningSummary(validation), screenedAt: validation.updatedAt } : null,
    creator: {
      id: rev.creatorId.toString(), name: creatorUser?.name ?? rev.author.name, username: creatorUser?.username ?? rev.author.username,
      avatar: creatorUser?.avatar ?? null, memberSince: creatorUser?.createdAt ?? null,
      submissions: Object.fromEntries(counts.map((c) => [c._id, c.n])),
      confirmedViolations: violations.filter((v) => v.status === 'confirmed').length,
      restrictedUntil: until,
      violations: violations.map((v) => ({ id: v._id.toString(), postTitle: v.postTitle, category: v.category, reason: v.reason, confirmedAt: v.confirmedAt, consequence: v.consequence, status: v.status, appeal: v.appeal })),
    },
    history,
  };
}

export async function history(actor: Staff, q: { actorId?: string; creatorId?: string; skip: number; limit: number }) {
  const filter: Record<string, unknown> = {};
  // Reviewers see their own actions; admins see everything (or filter by reviewer/creator)
  if (actor.role !== 'admin') filter.actorId = oid(actor.id);
  else if (q.actorId) filter.actorId = oid(q.actorId);
  if (q.creatorId) filter.creatorId = oid(q.creatorId);
  const [items, total] = await Promise.all([
    ReviewAction.find(filter).sort({ createdAt: -1 }).skip(q.skip).limit(q.limit).lean(),
    ReviewAction.countDocuments(filter),
  ]);
  return { items, total };
}

export async function pendingAppeals(skip: number, limit: number) {
  const filter = { 'appeal.status': 'pending' };
  const [items, total] = await Promise.all([
    Violation.find(filter).sort({ 'appeal.submittedAt': 1 }).skip(skip).limit(limit).lean(),
    Violation.countDocuments(filter),
  ]);
  return { items, total };
}

// ── Sweeper ────────────────────────────────────────────────────────────────────

/** Finish anything a crash left half-done: unscreened/unassigned submissions, approved-but-unpublished. */
export async function sweepModeration(): Promise<void> {
  const stale = new Date(Date.now() - 2 * 60_000);
  const open = await PremiumPostRevision.find({ status: 'in_review', assignedReviewerId: null, submittedAt: { $lt: stale } }).select('_id').limit(50).lean();
  for (const r of open) await processSubmission(r._id).catch((e) => console.error('[moderation] sweep submit:', e));

  const approved = await PremiumPostRevision.find({ status: 'approved', decidedAt: { $lt: stale, $gt: new Date(Date.now() - 7 * 86_400_000) } }).limit(100).lean<IPremiumPostRevision[]>();
  for (const r of approved) {
    const pp = await PremiumPost.findById(r.premiumPostId).select('liveRevisionId latestRevisionId').lean();
    if (pp && pp.latestRevisionId?.equals(r._id) && !pp.liveRevisionId?.equals(r._id)) {
      await publishRevision(r).catch((e) => console.error('[moderation] sweep publish:', e));
    }
  }
}
