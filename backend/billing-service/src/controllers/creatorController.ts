import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import CreatorProfile, { ICreatorProfile } from '../models/CreatorProfile';
import { CREATOR_GUIDELINES } from '../config/creatorGuidelines';
import { applyAsCreator, creatorStatus, setCreatorStatus, publicProfile } from '../services/creators';
import { AppError } from '../utils/errors';
import { pageParams } from '../utils/http';

// GET /api/creator/guidelines  (public)
export async function getGuidelines(_req: Request, res: Response) {
  res.json({ success: true, guidelines: CREATOR_GUIDELINES });
}

// GET /api/creator/me
export async function getMe(req: AuthRequest, res: Response) {
  res.json({ success: true, creator: await creatorStatus(req.user!.id) });
}

// POST /api/creator/apply  { displayName?, bio?, acceptGuidelines: true, guidelinesVersion }
export async function apply(req: AuthRequest, res: Response) {
  const profile = await applyAsCreator(req.user!.id, req.body ?? {});
  res.status(201).json({ success: true, profile, creator: await creatorStatus(req.user!.id) });
}

// GET /internal/creators/:userId
export async function internalCreatorStatus(req: Request, res: Response) {
  if (!Types.ObjectId.isValid(req.params.userId)) throw new AppError(400, 'Invalid userId.');
  res.json({ success: true, creator: await creatorStatus(req.params.userId) });
}

// GET /api/billing/admin/creators?status=
export async function adminListCreators(req: AuthRequest, res: Response) {
  const { page, limit, skip } = pageParams(req.query);
  const filter: Record<string, unknown> = {};
  if (req.query.status === 'active' || req.query.status === 'suspended') filter.status = req.query.status;
  const [items, total] = await Promise.all([
    CreatorProfile.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<ICreatorProfile[]>(),
    CreatorProfile.countDocuments(filter),
  ]);
  res.json({ success: true, creators: items.map(publicProfile), page, limit, total });
}

// POST /api/billing/admin/creators/:userId/status  { status, reason }
export async function adminSetCreatorStatus(req: AuthRequest, res: Response) {
  if (!Types.ObjectId.isValid(req.params.userId)) throw new AppError(400, 'Invalid userId.');
  const { status, reason } = (req.body ?? {}) as { status?: string; reason?: string };
  if (status !== 'active' && status !== 'suspended') throw new AppError(400, 'status must be active or suspended.');
  res.json({ success: true, profile: await setCreatorStatus(req.user!.id, req.params.userId, status, String(reason ?? '')) });
}
