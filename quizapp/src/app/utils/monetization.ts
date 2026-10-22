import { apiFetch } from './apiFetch';

// Shared client helpers for plans, quotas, creator, review and payouts.
// All amounts from the server are integer paise; format only at the edge.

const API = import.meta.env.VITE_API_URL ?? '';

/** An API error that keeps the server's machine-readable code (e.g. QUOTA_EXCEEDED). */
export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public body: Record<string, unknown> = {}) {
    super(message);
  }
}

/** JSON request through apiFetch (auth + refresh). Throws ApiError with the server's message. */
export async function api<T = Record<string, unknown>>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (json !== undefined) headers.set('Content-Type', 'application/json');
  let res: Response;
  try {
    res = await apiFetch(`${API}${path}`, { ...rest, headers, body: json !== undefined ? JSON.stringify(json) : rest.body });
  } catch {
    throw new ApiError('Network problem — check your connection and try again.', 0, 'NETWORK');
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || data.success === false) {
    throw new ApiError(String(data.message ?? 'Something went wrong. Please try again.'), res.status, data.code as string | undefined, data);
  }
  return data as T;
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inrWhole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

/** 4900 → "₹49", 1234 → "₹12.34" */
export function rupees(paise: number | null | undefined, opts: { whole?: boolean } = {}): string {
  const p = paise ?? 0;
  return opts.whole || p % 100 === 0 ? inrWhole.format(p / 100) : inr.format(p / 100);
}

export const formatDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const formatDateTime = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

/** A random key so a double click or retry never starts two payments / withdrawals. */
export function idempotencyKey(): string {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Shared types (subset of the server responses the screens use) ─────────────

export type PlanCode = 'free' | 'premium' | 'creator';

export interface Plan {
  code: PlanCode; name: string; pricePaise: number; periodDays: number; tier: number; description: string;
  billingType: 'one_time' | 'free';
  features: { unlimitedQuizPlay: boolean; unlimitedQuizCreate: boolean; creatorTools: boolean };
  dailyLimits: { quiz_play: number | null; quiz_create: number | null };
}

export interface Entitlements {
  plan: { code: PlanCode; name: string; tier: number };
  isPaid: boolean;
  subscription: { id: string; planCode: string; startsAt: string; endsAt: string } | null;
  upcoming: { id: string; planCode: string; startsAt: string; endsAt: string }[];
  features: Plan['features'];
  dailyLimits: Plan['dailyLimits'];
  role: string;
}

export interface CreditStatus { credit: string; unlimited: boolean; limit: number | null; used: number; reserved: number; remaining: number | null }
export interface Quota {
  plan: { code: PlanCode; name: string };
  isPaid: boolean;
  resetsAt: string | null;
  credits: { quiz_play: CreditStatus; quiz_create: CreditStatus };
  practice: { unlimited: boolean; consumesCredits: boolean };
}

export async function fetchQuota(): Promise<Quota> {
  return (await api<{ quota: Quota }>('/api/billing/quota')).quota;
}

export interface CreatorStatus {
  isCreatorPlan: boolean; hasProfile: boolean; profileStatus: 'active' | 'suspended' | null;
  canCreatePremium: boolean; reasons: string[]; planEndsAt: string | null;
  profile: { displayName: string; bio: string } | null;
}

export interface Balances {
  estimatedPaise: number; pendingPaise: number; approvedPaise: number; availablePaise: number;
  inWithdrawalPaise: number; paidPaise: number; reversedPaise: number; adjustmentsPaise: number; holdDays: number;
}

export function isStaff(role?: string): boolean {
  return role === 'reviewer' || role === 'admin';
}
