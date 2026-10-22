// Creator earnings rules. Money is always integer paise.
export const PAISE_PER_VIEW = 10;                        // ₹0.10 per eligible view (fixed by policy)

export const earningsConfig = () => ({
  /** Same viewer + same post counts once per this many hours (fixed windows, see docs). */
  dedupeHours:          Math.max(1, parseInt(process.env.VIEW_DEDUPE_HOURS ?? '24', 10) || 24),
  /** Earnings clear (become approved) this many days after the IST day of the view. */
  holdDays:             Math.max(1, parseInt(process.env.EARNINGS_HOLD_DAYS ?? '7', 10) || 7),
  /** More anonymous views than this from one network on one post in one day are not paid. */
  maxAnonPerIpPostDay:  Math.max(1, parseInt(process.env.VIEW_MAX_ANON_PER_IP_POST_DAY ?? '30', 10) || 30),
});

export const EARNINGS_DISCLAIMER =
  'Estimated and pending earnings can change: views are checked for fraud before they clear, and invalid views are removed. Creator Premium makes you eligible to earn; earnings are not guaranteed.';
