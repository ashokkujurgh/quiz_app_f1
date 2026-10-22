import axios, { AxiosError } from 'axios';

// Talks to billing-service, the single owner of plans and daily quotas.
// Enforcement is on when BILLING_SERVICE_URL and INTERNAL_SERVICE_SECRET are both set.
// When billing is configured but unreachable we refuse (fail closed) rather than give free credits.

export type CreditType = 'quiz_play' | 'quiz_create';

export class QuotaError extends Error {
  constructor(public status: number, message: string, public code: string, public upgradeTo?: string) {
    super(message);
  }
}

export const QUOTA_UNAVAILABLE = "We couldn't check your quiz limit right now. Please try again in a moment.";

let warned = false;
export function quotaEnabled(): boolean {
  const on = !!(process.env.BILLING_SERVICE_URL && process.env.INTERNAL_SERVICE_SECRET);
  if (!on && !warned && process.env.NODE_ENV !== 'test') {
    console.warn('⚠️  BILLING_SERVICE_URL / INTERNAL_SERVICE_SECRET not set — daily quiz limits are NOT enforced.');
    warned = true;
  }
  return on;
}

function http() {
  return axios.create({
    baseURL: process.env.BILLING_SERVICE_URL,
    headers: { 'x-internal-secret': process.env.INTERNAL_SERVICE_SECRET ?? '' },
    timeout: 5000,
  });
}

function toQuotaError(err: unknown): QuotaError {
  const e = err as AxiosError<{ message?: string; code?: string; upgradeTo?: string }>;
  const data = e.response?.data;
  if (e.response?.status === 403 && data?.code === 'QUOTA_EXCEEDED') {
    return new QuotaError(403, data.message ?? 'Daily limit reached.', 'QUOTA_EXCEEDED', data.upgradeTo);
  }
  console.error('[billing] quota call failed:', e.response?.status ?? '', e.message);
  return new QuotaError(503, QUOTA_UNAVAILABLE, 'QUOTA_UNAVAILABLE');
}

async function post(path: string, body: Record<string, unknown>) {
  try {
    const { data } = await http().post(path, body);
    return data;
  } catch (err) {
    throw toQuotaError(err);
  }
}

/** Hold a credit for `refKey` (idempotent). Throws QuotaError when none is left. */
export async function reserveCredit(userId: string, credit: CreditType, refKey: string, expiresAt?: Date, forDay?: string): Promise<void> {
  if (!quotaEnabled()) return;
  await post('/internal/quota/reserve', { userId, credit, refKey, expiresAt: expiresAt?.toISOString(), forDay });
}

/** Use a credit for `refKey`, reserving first if needed (idempotent). */
export async function consumeCredit(userId: string, credit: CreditType, refKey: string, expiresAt?: Date, forDay?: string): Promise<void> {
  if (!quotaEnabled()) return;
  await post('/internal/quota/consume', { userId, credit, refKey, expiresAt: expiresAt?.toISOString(), forDay });
}

/** Give back an unconsumed credit. Never throws: a missed release is repaired by billing's expiry job. */
export async function releaseCredit(userId: string, credit: CreditType, refKey: string, reason: string): Promise<void> {
  if (!quotaEnabled()) return;
  try { await post('/internal/quota/release', { userId, credit, refKey, reason }); }
  catch (err) { console.warn('[billing] release failed (will expire on its own):', (err as Error).message); }
}

export async function releaseAllForRef(credit: CreditType, refKey: string, reason: string): Promise<void> {
  if (!quotaEnabled()) return;
  try { await post('/internal/quota/release-ref', { credit, refKey, reason }); }
  catch (err) { console.warn('[billing] release-ref failed (will expire on its own):', (err as Error).message); }
}

export interface Eligibility { allowed: boolean; code?: string; message?: string; upgradeTo?: string; remaining: number | null; unlimited: boolean }

export async function checkEligibility(userId: string, credit: CreditType, forDay?: string): Promise<Eligibility> {
  if (!quotaEnabled()) return { allowed: true, remaining: null, unlimited: true };
  try {
    const { data } = await http().get(`/internal/quota/${encodeURIComponent(userId)}/eligibility`, { params: { credit, forDay } });
    return data.eligibility as Eligibility;
  } catch (err) {
    throw toQuotaError(err);
  }
}
