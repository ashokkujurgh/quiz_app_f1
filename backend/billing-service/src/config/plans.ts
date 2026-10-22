// Default plan catalogue. Seeded into the `plans` collection on boot with $setOnInsert,
// so prices/names an admin changes in the DB are never overwritten by a restart.
// All money is integer paise (₹49 = 4900).

export type PlanCode = 'free' | 'premium' | 'creator';

export interface PlanFeatures {
  unlimitedQuizPlay:   boolean;
  unlimitedQuizCreate: boolean;
  creatorTools:        boolean;
}

export interface PlanDefinition {
  code:         PlanCode;
  name:         string;
  pricePaise:   number;
  periodDays:   number;
  tier:         number;          // higher = more features; used for upgrades
  features:     PlanFeatures;
  dailyLimits:  { quiz_play: number | null; quiz_create: number | null }; // null = unlimited
  description:  string;
}

export const DEFAULT_PLANS: PlanDefinition[] = [
  {
    code: 'free', name: 'Free', pricePaise: 0, periodDays: 0, tier: 0,
    features: { unlimitedQuizPlay: false, unlimitedQuizCreate: false, creatorTools: false },
    dailyLimits: { quiz_play: 1, quiz_create: 1 },
    description: 'Read every post, unlimited practice tests, 1 quiz play and 1 quiz creation per day.',
  },
  {
    code: 'premium', name: 'Premium', pricePaise: 4900, periodDays: 30, tier: 1,
    features: { unlimitedQuizPlay: true, unlimitedQuizCreate: true, creatorTools: false },
    dailyLimits: { quiz_play: null, quiz_create: null },
    description: 'Unlimited daily quizzes, games and quiz creation.',
  },
  {
    code: 'creator', name: 'Creator Premium', pricePaise: 9900, periodDays: 30, tier: 2,
    features: { unlimitedQuizPlay: true, unlimitedQuizCreate: true, creatorTools: true },
    dailyLimits: { quiz_play: null, quiz_create: null },
    description: 'Everything in Premium, plus premium posts, analytics, earnings and withdrawals.',
  },
];

/** The furthest ahead a user may buy (stacked renewals), to stop accidental repeat purchases. */
export const MAX_PREPAID_DAYS = 400;
