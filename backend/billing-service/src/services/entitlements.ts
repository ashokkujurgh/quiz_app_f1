import { Types } from 'mongoose';
import User from '../models/User';
import UserSubscription, { IUserSubscription } from '../models/UserSubscription';
import { getPlan } from './plans';
import { PlanCode, PlanFeatures } from '../config/plans';
import { AppError } from '../utils/errors';

export interface Entitlements {
  userId:       string;
  role:         string;
  plan:         { code: PlanCode; name: string; tier: number };
  isPaid:       boolean;
  subscription: { id: string; planCode: string; startsAt: Date; endsAt: Date } | null;
  upcoming:     { id: string; planCode: string; startsAt: Date; endsAt: Date }[];
  features:     PlanFeatures;
  /** null = unlimited. Admins are unlimited regardless of plan. */
  dailyLimits:  { quiz_play: number | null; quiz_create: number | null };
}

const brief = (s: IUserSubscription) => ({ id: s._id.toString(), planCode: s.planCode, startsAt: s.startsAt, endsAt: s.endsAt });

/**
 * The single source of truth for "what can this user do right now".
 * Computed from dates, so an expired plan loses its entitlements the instant endsAt passes,
 * even if the expiry job hasn't run yet.
 */
export async function getEntitlements(userId: string, now: Date = new Date()): Promise<Entitlements> {
  if (!Types.ObjectId.isValid(userId)) throw new AppError(400, 'Invalid user id.');
  const user = await User.findById(userId).select('role isActive').lean();
  if (!user) throw new AppError(404, 'User not found.');

  const subs = await UserSubscription.find({ userId: new Types.ObjectId(userId), status: 'active', endsAt: { $gt: now } })
    .sort({ startsAt: 1 }).lean<IUserSubscription[]>();

  const current  = subs.filter((s) => s.startsAt <= now).sort((a, b) => b.tier - a.tier)[0] ?? null;
  const upcoming = subs.filter((s) => s.startsAt > now);

  const planCode: PlanCode = current ? current.planCode : 'free';
  const plan = await getPlan(planCode);
  if (!plan) throw new AppError(500, 'Plan catalogue is not set up.');

  const isAdmin = user.role === 'admin';
  const dailyLimits = isAdmin ? { quiz_play: null, quiz_create: null } : { ...plan.dailyLimits };

  return {
    userId,
    role:         user.role,
    plan:         { code: plan.code, name: plan.name, tier: plan.tier },
    isPaid:       !!current,
    subscription: current ? brief(current) : null,
    upcoming:     upcoming.map(brief),
    features:     { ...plan.features },
    dailyLimits,
  };
}
