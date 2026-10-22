import { Types } from 'mongoose';
import CreatorProfile, { ICreatorProfile } from '../models/CreatorProfile';
import User from '../models/User';
import AuditLog from '../models/AuditLog';
import { getEntitlements } from './entitlements';
import { GUIDELINES_VERSION } from '../config/creatorGuidelines';
import { AppError } from '../utils/errors';

export interface CreatorStatus {
  userId:            string;
  isCreatorPlan:     boolean;          // Creator Premium active right now
  hasProfile:        boolean;
  profileStatus:     'active' | 'suspended' | null;
  guidelinesCurrent: boolean;
  /** May create, edit and submit premium posts right now. */
  canCreatePremium:  boolean;
  /** Why not, in words a creator can act on (empty when allowed). */
  reasons:           string[];
  planEndsAt:        Date | null;
  profile:           ReturnType<typeof publicProfile> | null;
}

export const publicProfile = (p: ICreatorProfile) => ({
  id: p._id.toString(), userId: p.userId.toString(), displayName: p.displayName, bio: p.bio,
  status: p.status, guidelinesVersion: p.guidelinesVersion, acceptedGuidelinesAt: p.acceptedGuidelinesAt, createdAt: p.createdAt,
});

export async function creatorStatus(userId: string): Promise<CreatorStatus> {
  const [ent, profile] = await Promise.all([
    getEntitlements(userId),
    CreatorProfile.findOne({ userId: new Types.ObjectId(userId) }).lean<ICreatorProfile>(),
  ]);
  const isCreatorPlan = ent.features.creatorTools;
  const reasons: string[] = [];
  if (!isCreatorPlan) reasons.push(ent.isPaid
    ? 'Premium posts need the Creator Premium plan (₹99/month). Upgrade to continue.'
    : 'Premium posts need an active Creator Premium plan (₹99/month).');
  if (!profile) reasons.push('Complete creator onboarding and accept the creator guidelines.');
  else if (profile.status === 'suspended') reasons.push('Your creator account is suspended. Contact support.');
  else if (profile.guidelinesVersion !== GUIDELINES_VERSION) reasons.push('The creator guidelines were updated. Please review and accept them again.');

  return {
    userId,
    isCreatorPlan,
    hasProfile: !!profile,
    profileStatus: profile?.status ?? null,
    guidelinesCurrent: profile?.guidelinesVersion === GUIDELINES_VERSION,
    canCreatePremium: reasons.length === 0,
    reasons,
    planEndsAt: isCreatorPlan && ent.subscription ? ent.subscription.endsAt : null,
    profile: profile ? publicProfile(profile) : null,
  };
}

/** Onboarding: needs Creator Premium and explicit acceptance of the current guidelines. Re-applying updates the profile. */
export async function applyAsCreator(userId: string, input: { displayName?: string; bio?: string; acceptGuidelines?: boolean; guidelinesVersion?: string }) {
  if (input.acceptGuidelines !== true) throw new AppError(400, 'Please read and accept the creator guidelines.');
  if (input.guidelinesVersion !== GUIDELINES_VERSION) throw new AppError(409, 'The guidelines have changed. Please reload and accept the latest version.', 'GUIDELINES_CHANGED');

  const ent = await getEntitlements(userId);
  if (!ent.features.creatorTools) throw new AppError(403, 'Creator onboarding needs an active Creator Premium plan (₹99/month).', 'CREATOR_PLAN_REQUIRED', { upgradeTo: 'creator' });

  const user = await User.findById(userId).select('name').lean();
  const displayName = (input.displayName ?? user?.name ?? '').trim();
  if (displayName.length < 2 || displayName.length > 60) throw new AppError(400, 'Display name must be 2–60 characters.');
  const bio = (input.bio ?? '').trim();
  if (bio.length > 300) throw new AppError(400, 'Bio can be at most 300 characters.');

  const existing = await CreatorProfile.findOne({ userId: new Types.ObjectId(userId) });
  if (existing?.status === 'suspended') throw new AppError(403, 'Your creator account is suspended. Contact support.');

  const profile = await CreatorProfile.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    { $set: { displayName, bio, guidelinesVersion: GUIDELINES_VERSION, acceptedGuidelinesAt: new Date() }, $setOnInsert: { status: 'active' } },
    { upsert: true, new: true, runValidators: true }
  );
  return publicProfile(profile.toObject());
}

/** Admin: suspend or reinstate a creator. Logged. Nothing is deleted. */
export async function setCreatorStatus(actorId: string, userId: string, status: 'active' | 'suspended', reason: string) {
  if (!reason?.trim()) throw new AppError(400, 'A reason is required.');
  const p = await CreatorProfile.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    { $set: { status, statusReason: reason.trim() } },
    { new: true }
  );
  if (!p) throw new AppError(404, 'Creator not found.');
  await AuditLog.create({ actorId: new Types.ObjectId(actorId), actorRole: 'admin', action: `creator.${status}`,
    targetType: 'user', targetId: userId, details: { reason: reason.trim() } });
  return publicProfile(p.toObject());
}
