import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as premium from '../services/premiumPosts';
import * as images from '../services/premiumImages';
import { IMAGE_RULES } from '../services/imageProcessing';
import { getCreatorStatus, getPostStats } from '../services/billingClient';
import { pageParams } from '../utils/http';

const uid = (req: AuthRequest) => req.user!.id;

// GET /api/posts/premium/meta — rules, AI image availability, creator eligibility
export async function meta(req: AuthRequest, res: Response) {
  let creator = null;
  try { creator = await getCreatorStatus(uid(req)); } catch { creator = null; }
  res.json({
    success: true,
    creator,
    rules: premium.PREMIUM_RULES,
    imageRules: { maxBytes: IMAGE_RULES.maxBytes, formats: IMAGE_RULES.formats, minWidth: IMAGE_RULES.minWidth, minHeight: IMAGE_RULES.minHeight },
    aiImage: await images.aiUsageToday(uid(req)),
  });
}

export async function create(req: AuthRequest, res: Response) {
  res.status(201).json({ success: true, post: await premium.createDraft(uid(req), req.body ?? {}) });
}

export async function update(req: AuthRequest, res: Response) {
  res.json({ success: true, post: await premium.updateDraft(uid(req), req.params.id, req.body ?? {}) });
}

export async function listMine(req: AuthRequest, res: Response) {
  const { page, limit, skip } = pageParams(req.query);
  const { items, total } = await premium.listOwn(uid(req), { status: typeof req.query.status === 'string' ? req.query.status : undefined }, { skip, limit });
  // Views/earnings come from billing-service (server data only); null when it can't be reached
  const ids = items.map((p) => p.publicPostId).filter((x): x is string => !!x);
  const stats = await getPostStats(uid(req), ids);
  const empty = { eligibleViews: 0, earnedPaise: 0, approvedPaise: 0, estimatedPaise: 0, lastViewAt: null };
  res.json({
    success: true, page, limit, total, statsAvailable: stats !== null,
    posts: items.map((p) => ({ ...p, stats: p.publicPostId ? (stats ? stats[p.publicPostId] ?? empty : null) : null })),
  });
}

export async function getOne(req: AuthRequest, res: Response) {
  res.json({ success: true, ...(await premium.getOwn(uid(req), req.params.id)) });
}

export async function preview(req: AuthRequest, res: Response) {
  res.json({ success: true, preview: await premium.preview(uid(req), req.params.id) });
}

export async function submit(req: AuthRequest, res: Response) {
  const rev = await premium.submit(uid(req), req.params.id);
  res.status(201).json({
    success: true,
    message: 'Submitted for review. A reviewer will approve or reject it; you will get an email either way.',
    revision: { id: rev._id.toString(), version: rev.version, status: rev.status, submittedAt: rev.submittedAt },
  });
}

export async function withdraw(req: AuthRequest, res: Response) {
  res.json({ success: true, post: await premium.withdraw(uid(req), req.params.id) });
}

export async function unpublish(req: AuthRequest, res: Response) {
  res.json({ success: true, post: await premium.unpublish(uid(req), req.params.id) });
}

export async function republish(req: AuthRequest, res: Response) {
  res.json({ success: true, post: await premium.republish(uid(req), req.params.id) });
}

export async function remove(req: AuthRequest, res: Response) {
  await premium.removeDraft(uid(req), req.params.id);
  res.json({ success: true });
}

// POST /api/posts/premium/upload  (multipart, field "image")
export async function upload(req: AuthRequest, res: Response) {
  const file = (req as AuthRequest & { file?: Express.Multer.File }).file;
  res.status(201).json({ success: true, image: await images.uploadPremiumImage(uid(req), file?.buffer) });
}

// POST /api/posts/premium/:id/ai-image  — generate a candidate (explicit click only)
export async function aiGenerate(req: AuthRequest, res: Response) {
  const candidate = await images.generateCandidate(uid(req), req.params.id);
  res.status(201).json({ success: true, candidate, usage: await images.aiUsageToday(uid(req)) });
}

// POST /api/posts/premium/:id/ai-image/:candidateId/accept  { setAsCover?: boolean }
export async function aiAccept(req: AuthRequest, res: Response) {
  const setAsCover = (req.body as { setAsCover?: boolean })?.setAsCover !== false;
  const { candidate } = await images.acceptCandidate(uid(req), req.params.id, req.params.candidateId, setAsCover);
  const post = setAsCover ? await premium.updateDraft(uid(req), req.params.id, { coverImage: candidate.url }) : null;
  res.json({ success: true, candidate, post });
}

// POST /api/posts/premium/:id/ai-image/:candidateId/discard
export async function aiDiscard(req: AuthRequest, res: Response) {
  res.json({ success: true, candidate: await images.discardCandidate(uid(req), req.params.candidateId) });
}
