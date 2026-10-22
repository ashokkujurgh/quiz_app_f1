import Plan, { IPlan } from '../models/Plan';
import { PlanCode } from '../config/plans';

let cache: { at: number; plans: IPlan[] } | null = null;
const TTL_MS = 60_000;

export async function getPlans(): Promise<IPlan[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.plans;
  const plans = await Plan.find({}).sort({ tier: 1 }).lean<IPlan[]>();
  cache = { at: Date.now(), plans };
  return plans;
}

export async function getPlan(code: PlanCode): Promise<IPlan | null> {
  return (await getPlans()).find((p) => p.code === code) ?? null;
}

export function clearPlanCache(): void { cache = null; }

/** Shape safe to send to any client. */
export function publicPlan(p: IPlan) {
  return {
    code:        p.code,
    name:        p.name,
    pricePaise:  p.pricePaise,
    currency:    p.currency,
    periodDays:  p.periodDays,
    tier:        p.tier,
    features:    p.features,
    dailyLimits: p.dailyLimits,
    description: p.description,
    billingType: p.pricePaise > 0 ? 'one_time' : 'free',
  };
}
