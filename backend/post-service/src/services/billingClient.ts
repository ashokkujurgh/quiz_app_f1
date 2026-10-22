import axios, { AxiosError } from 'axios';
import { AppError } from '../utils/errors';

// billing-service owns plans and creator profiles. Premium features are paid-only, so when billing
// is not configured or unreachable they are refused (never silently allowed).

export interface CreatorStatus {
  userId:           string;
  isCreatorPlan:    boolean;
  hasProfile:       boolean;
  profileStatus:    'active' | 'suspended' | null;
  canCreatePremium: boolean;
  reasons:          string[];
  planEndsAt:       string | null;
  profile:          { displayName: string; bio: string } | null;
}

export function billingConfigured(): boolean {
  return !!(process.env.BILLING_SERVICE_URL && process.env.INTERNAL_SERVICE_SECRET);
}

export async function getCreatorStatus(userId: string): Promise<CreatorStatus> {
  if (!billingConfigured()) throw new AppError(503, 'Creator features are not available yet.', 'CREATOR_FEATURES_OFF');
  try {
    const { data } = await axios.get(`${process.env.BILLING_SERVICE_URL}/internal/creators/${encodeURIComponent(userId)}`, {
      headers: { 'x-internal-secret': process.env.INTERNAL_SERVICE_SECRET! },
      timeout: 5000,
    });
    return data.creator as CreatorStatus;
  } catch (err) {
    console.error('[billing] creator status failed:', (err as AxiosError).response?.status ?? '', (err as Error).message);
    throw new AppError(503, "We couldn't check your creator plan right now. Please try again.", 'BILLING_UNAVAILABLE');
  }
}

/** Throws a 403 with the reasons unless the user may create premium posts right now. */
export async function requireCreatorNow(userId: string): Promise<CreatorStatus> {
  const s = await getCreatorStatus(userId);
  if (!s.canCreatePremium) {
    throw new AppError(403, s.reasons[0] ?? 'Premium posts are not available on your account.', 'CREATOR_NOT_ELIGIBLE', { reasons: s.reasons, upgradeTo: s.isCreatorPlan ? undefined : 'creator' });
  }
  return s;
}

export interface PostStats { eligibleViews: number; earnedPaise: number; approvedPaise: number; estimatedPaise: number; lastViewAt: string | null }

/** Views and earnings per public post, for the creator's posts table. Best effort: null if billing is unavailable. */
export async function getPostStats(creatorId: string, postIds: string[]): Promise<Record<string, PostStats> | null> {
  if (!billingConfigured() || !postIds.length) return postIds.length ? null : {};
  try {
    const { data } = await axios.post(`${process.env.BILLING_SERVICE_URL}/internal/earnings/posts`, { creatorId, postIds },
      { headers: { 'x-internal-secret': process.env.INTERNAL_SERVICE_SECRET! }, timeout: 5000 });
    return data.stats as Record<string, PostStats>;
  } catch (err) {
    console.warn('[billing] post stats unavailable:', (err as Error).message);
    return null;
  }
}
