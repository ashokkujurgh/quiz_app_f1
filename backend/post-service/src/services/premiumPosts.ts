import crypto from 'crypto';
import { Types } from 'mongoose';
import PremiumPost, { IPremiumPost, IPremiumWorkingCopy } from '../models/PremiumPost';
import PremiumPostRevision, { IPremiumPostRevision } from '../models/PremiumPostRevision';
import UploadedAsset from '../models/UploadedAsset';
import Post from '../models/Post';
import User from '../models/User';
import { sanitizePostContent, toPlainText } from '../utils/html';
import { requireCreatorNow, getCreatorStatus } from './billingClient';
import { AppError } from '../utils/errors';
import ReviewAction from '../models/ReviewAction';
import { assertNotRestricted } from './violations';
import { processSubmission } from './moderation';

export const PREMIUM_RULES = {
  titleMin: 10, titleMax: 150,
  minWords: 150, maxHtmlChars: 30000,
  maxTags: 8, tagMin: 2, tagMax: 30,
  maxExtraImages: 4,
  maxPostsPerCreator: 300,
};

export interface DraftInput {
  title?: string; content?: string; topic?: string; subTopic?: string | null;
  tags?: string[]; coverImage?: string | null; images?: string[];
}

const oid = (id: string) => {
  if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'Invalid id.');
  return new Types.ObjectId(id);
};

export function hashCopy(c: IPremiumWorkingCopy): string {
  const stable = JSON.stringify([c.title, c.content, c.topic, c.subTopic ?? null, c.tags, c.coverImage ?? null, c.images, !!c.isAiImage]);
  return crypto.createHash('sha256').update(stable).digest('hex');
}

export function normalizeTags(tags: unknown): string[] {
  if (tags === undefined) return [];
  if (!Array.isArray(tags)) throw new AppError(400, 'tags must be a list.');
  const out: string[] = [];
  for (const raw of tags) {
    const t = String(raw).trim().replace(/^#/, '').replace(/\s+/g, ' ').toLowerCase();
    if (!t) continue;
    if (t.length < PREMIUM_RULES.tagMin || t.length > PREMIUM_RULES.tagMax) throw new AppError(400, `Each tag must be ${PREMIUM_RULES.tagMin}–${PREMIUM_RULES.tagMax} characters.`);
    if (!/^[\p{L}\p{N} .+&-]+$/u.test(t)) throw new AppError(400, 'Tags can only contain letters, numbers, spaces and - . + &');
    if (!out.includes(t)) out.push(t);
  }
  if (out.length > PREMIUM_RULES.maxTags) throw new AppError(400, `Use at most ${PREMIUM_RULES.maxTags} tags.`);
  return out;
}

async function assertOwnedImages(ownerId: Types.ObjectId, urls: string[]): Promise<void> {
  if (!urls.length) return;
  const found = await UploadedAsset.countDocuments({ ownerId, url: { $in: urls } });
  if (found !== new Set(urls).size) throw new AppError(400, 'Images must be uploaded or generated through Meenzo.', 'IMAGE_NOT_OWNED');
}

/** Field limits enforced on every save (drafts may be incomplete). */
async function applyInput(post: IPremiumPost, input: DraftInput): Promise<void> {
  const d = post.draft;
  if (input.title !== undefined) {
    const t = String(input.title ?? '').trim().replace(/\s+/g, ' ');
    if (t.length > PREMIUM_RULES.titleMax) throw new AppError(400, `Title can be at most ${PREMIUM_RULES.titleMax} characters.`);
    d.title = t;
  }
  if (input.content !== undefined) {
    const html = sanitizePostContent(String(input.content ?? ''));
    if (html.length > PREMIUM_RULES.maxHtmlChars) throw new AppError(400, 'Post is too long.');
    d.content = html;
  }
  if (input.topic !== undefined) d.topic = String(input.topic ?? '').trim().slice(0, 80);
  if (input.subTopic !== undefined) d.subTopic = input.subTopic ? String(input.subTopic).trim().slice(0, 80) : null;
  if (input.tags !== undefined) d.tags = normalizeTags(input.tags);
  if (input.coverImage !== undefined) {
    if (input.coverImage === null || input.coverImage === '') { d.coverImage = null; d.isAiImage = false; }
    else {
      const url = String(input.coverImage);
      await assertOwnedImages(post.creatorId, [url]);
      if (url !== d.coverImage) {
        const asset = await UploadedAsset.findOne({ ownerId: post.creatorId, url }).select('source').lean();
        d.isAiImage = asset?.source === 'ai';
      }
      d.coverImage = url;
    }
  }
  if (input.images !== undefined) {
    if (!Array.isArray(input.images)) throw new AppError(400, 'images must be a list.');
    const urls = [...new Set(input.images.map(String))];
    if (urls.length > PREMIUM_RULES.maxExtraImages) throw new AppError(400, `Add at most ${PREMIUM_RULES.maxExtraImages} extra images.`);
    await assertOwnedImages(post.creatorId, urls);
    d.images = urls;
  }
  post.markModified('draft');
  post.draftHash = hashCopy(d);
}

export interface Check { id: string; ok: boolean; message: string }

/** What must be true before a post can be submitted for review. Shown to the creator as a checklist. */
export function submissionChecks(d: IPremiumWorkingCopy): Check[] {
  const plain = toPlainText(d.content || '');
  const words = plain ? plain.split(/\s+/).filter(Boolean).length : 0;
  return [
    { id: 'title',    ok: d.title.length >= PREMIUM_RULES.titleMin && d.title.length <= PREMIUM_RULES.titleMax, message: `Title of ${PREMIUM_RULES.titleMin}–${PREMIUM_RULES.titleMax} characters` },
    { id: 'length',   ok: words >= PREMIUM_RULES.minWords, message: `At least ${PREMIUM_RULES.minWords} words (now ${words})` },
    { id: 'category', ok: !!d.topic, message: 'An educational category' },
    { id: 'cover',    ok: !!d.coverImage, message: 'A cover image (upload or generate one)' },
    { id: 'tags',     ok: d.tags.length <= PREMIUM_RULES.maxTags, message: `At most ${PREMIUM_RULES.maxTags} tags` },
  ];
}

export function displayStatus(p: Pick<IPremiumPost, 'status' | 'reviewState' | 'deletedAt'>): string {
  if (p.deletedAt) return 'deleted';
  if (p.status === 'unpublished') return 'unpublished';
  if (p.status === 'published') {
    if (p.reviewState === 'in_review') return 'published_edit_in_review';
    if (p.reviewState === 'rejected')  return 'published_edit_rejected';
    return 'published';
  }
  if (p.reviewState === 'in_review') return 'in_review';
  if (p.reviewState === 'rejected')  return 'rejected';
  return 'draft';
}

export function ownerView(p: IPremiumPost) {
  return {
    id: p._id.toString(),
    status: p.status,
    reviewState: p.reviewState,
    displayStatus: displayStatus(p),
    draft: p.draft,
    hasUnsubmittedChanges: !!p.draftHash && p.draftHash !== p.submittedHash,
    publicPostId: p.publicPostId?.toString() ?? null,
    version: p.version,
    submittedAt: p.submittedAt,
    publishedAt: p.publishedAt,
    unpublishedAt: p.unpublishedAt,
    lastRejectionReason: p.lastRejectionReason,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

async function loadOwn(userId: string, id: string) {
  const post = await PremiumPost.findOne({ _id: oid(id), creatorId: oid(userId), deletedAt: null });
  if (!post) throw new AppError(404, 'Post not found.');
  return post;
}

// ── Commands ─────────────────────────────────────────────────────────────────

export async function createDraft(userId: string, input: DraftInput) {
  await requireCreatorNow(userId);
  const creatorId = oid(userId);
  if (await PremiumPost.countDocuments({ creatorId, deletedAt: null }) >= PREMIUM_RULES.maxPostsPerCreator) {
    throw new AppError(409, 'You have reached the maximum number of premium posts. Delete old drafts first.');
  }
  const post = new PremiumPost({ creatorId });
  await applyInput(post, input);
  await post.save();
  return ownerView(post);
}

export async function updateDraft(userId: string, id: string, input: DraftInput) {
  await requireCreatorNow(userId);
  const post = await loadOwn(userId, id);
  await applyInput(post, input);
  await post.save();
  return ownerView(post);
}

export async function getOwn(userId: string, id: string) {
  const post = await loadOwn(userId, id);
  const revisions = await PremiumPostRevision.find({ premiumPostId: post._id }).sort({ version: -1 })
    .select('version status submittedAt decidedAt title decisionReason').lean();
  return { post: ownerView(post), checks: submissionChecks(post.draft), revisions };
}

export async function listOwn(userId: string, filter: { status?: string }, page: { skip: number; limit: number }) {
  const q: Record<string, unknown> = { creatorId: oid(userId), deletedAt: null };
  const statusMap: Record<string, Record<string, unknown>> = {
    draft:       { status: 'draft', reviewState: 'none' },
    in_review:   { reviewState: 'in_review' },
    rejected:    { reviewState: 'rejected' },
    published:   { status: 'published' },
    unpublished: { status: 'unpublished' },
  };
  if (filter.status && statusMap[filter.status]) Object.assign(q, statusMap[filter.status]);
  const [items, total] = await Promise.all([
    PremiumPost.find(q).sort({ updatedAt: -1 }).skip(page.skip).limit(page.limit),
    PremiumPost.countDocuments(q),
  ]);
  return { items: items.map(ownerView), total };
}

export async function preview(userId: string, id: string) {
  const post = await loadOwn(userId, id);
  const d = post.draft;
  const plain = toPlainText(d.content || '');
  const words = plain ? plain.split(/\s+/).filter(Boolean).length : 0;
  return {
    title: d.title, html: d.content, topic: d.topic, subTopic: d.subTopic, tags: d.tags,
    coverImage: d.coverImage, images: d.images, isAiImage: d.isAiImage,
    wordCount: words, readingMinutes: Math.max(1, Math.round(words / 200)),
    checks: submissionChecks(d),
  };
}

/**
 * Submit the working copy for review as a new immutable revision. Requires an active Creator
 * Premium plan and an accepted profile; human approval is always required before anything goes live.
 */
export async function submit(userId: string, id: string): Promise<IPremiumPostRevision> {
  const status = await requireCreatorNow(userId);
  await assertNotRestricted(userId);           // 30-day block after the 3rd confirmed violation
  const post = await loadOwn(userId, id);

  const failed = submissionChecks(post.draft).filter((c) => !c.ok);
  if (failed.length) throw new AppError(422, 'Please complete the post before submitting.', 'SUBMISSION_INCOMPLETE', { checks: failed });
  await assertOwnedImages(post.creatorId, [post.draft.coverImage!, ...post.draft.images]);
  if (post.reviewState === 'in_review') throw new AppError(409, 'This post is already waiting for review.', 'ALREADY_IN_REVIEW');
  if (post.draftHash === post.submittedHash) throw new AppError(409, 'Make changes before submitting again.', 'NO_CHANGES');

  const prevState = post.reviewState;
  const claimed = await PremiumPost.findOneAndUpdate(
    { _id: post._id, reviewState: { $ne: 'in_review' }, draftHash: post.draftHash },
    { $set: { reviewState: 'in_review', submittedHash: post.draftHash, submittedAt: new Date() }, $inc: { version: 1 } },
    { new: true }
  );
  if (!claimed) throw new AppError(409, 'The post changed or is already in review. Please reload.', 'CONFLICT');

  const user = await User.findById(userId).select('name username avatar').lean();
  const d = claimed.draft;
  const plain = toPlainText(d.content);
  try {
    const revision = await PremiumPostRevision.create({
      premiumPostId: claimed._id, creatorId: claimed.creatorId, version: claimed.version,
      title: d.title, content: d.content, plainText: plain, wordCount: plain.split(/\s+/).filter(Boolean).length,
      topic: d.topic, subTopic: d.subTopic, tags: d.tags, coverImage: d.coverImage!, images: d.images, isAiImage: d.isAiImage,
      contentHash: claimed.draftHash,
      author: { name: status.profile?.displayName || user?.name || 'Creator', username: user?.username ?? 'creator', avatar: user?.avatar ?? null },
      status: 'in_review', submittedAt: claimed.submittedAt!,
    });
    await PremiumPost.updateOne({ _id: claimed._id }, { $set: { latestRevisionId: revision._id } });
    await ReviewAction.create({ revisionId: revision._id, premiumPostId: claimed._id, creatorId: claimed.creatorId, actorId: claimed.creatorId, actorRole: 'creator', action: 'submitted', details: { version: revision.version } });
    // Screening (advice only) + reviewer assignment + email. Failures here never undo the submission;
    // the sweeper job finishes anything left half-done.
    await processSubmission(revision._id).catch((e) => console.error('[premium] post-submit processing:', (e as Error).message));
    return revision.toObject();
  } catch (err) {
    await PremiumPost.updateOne({ _id: claimed._id }, { $set: { reviewState: prevState, submittedHash: post.submittedHash }, $inc: { version: -1 } });
    if ((err as { code?: number }).code === 11000) throw new AppError(409, 'This post is already waiting for review.', 'ALREADY_IN_REVIEW');
    throw err;
  }
}

/** Pull a submission back before a reviewer decides. */
export async function withdraw(userId: string, id: string) {
  const post = await loadOwn(userId, id);
  const rev = await PremiumPostRevision.findOneAndUpdate(
    { premiumPostId: post._id, status: 'in_review' },
    { $set: { status: 'withdrawn', decidedAt: new Date() } },
    { new: true }
  );
  if (!rev) throw new AppError(409, 'Nothing is waiting for review.');
  await ReviewAction.create({ revisionId: rev._id, premiumPostId: post._id, creatorId: post.creatorId, actorId: post.creatorId, actorRole: 'creator', action: 'withdrawn', details: { version: rev.version } });
  post.reviewState = post.status === 'draft' ? 'none' : 'approved';
  post.submittedHash = null;
  await post.save();
  return ownerView(post);
}

/** Take a published post off the site. Earnings history and analytics stay. Allowed even if the plan lapsed. */
export async function unpublish(userId: string, id: string) {
  const post = await loadOwn(userId, id);
  if (post.status !== 'published' || !post.publicPostId) throw new AppError(409, 'Only published posts can be unpublished.');
  await Post.updateOne({ _id: post.publicPostId }, { $set: { isActive: false } });
  post.status = 'unpublished';
  post.unpublishedAt = new Date();
  await post.save();
  return ownerView(post);
}

/** Put an unpublished post back live with its last approved version (no re-review needed). */
export async function republish(userId: string, id: string) {
  await requireCreatorNow(userId);
  const post = await loadOwn(userId, id);
  if (post.status !== 'unpublished' || !post.publicPostId || !post.liveRevisionId) throw new AppError(409, 'Only unpublished posts can be republished.');
  await Post.updateOne({ _id: post.publicPostId }, { $set: { isActive: true } });
  post.status = 'published';
  post.unpublishedAt = null;
  await post.save();
  return ownerView(post);
}

/** Delete a draft that was never published. Published posts are unpublished instead (history is kept). */
export async function removeDraft(userId: string, id: string) {
  const post = await loadOwn(userId, id);
  if (post.status !== 'draft' || post.reviewState === 'in_review') {
    throw new AppError(409, post.reviewState === 'in_review' ? 'Withdraw the submission before deleting.' : 'Published posts cannot be deleted. Unpublish it instead.');
  }
  post.deletedAt = new Date();
  await post.save();
}

export { getCreatorStatus };
