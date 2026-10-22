# Phase 6 — View tracking, earnings ledger, creator analytics

Status: **implemented and tested (backend only).** Dashboard screens and charts come in Phase 8. Nothing is deployed or committed.

## How a view is counted (plain language)
1. A reader opens an approved, published premium post. The post API returns the post as usual plus a **signed view token** (valid 30 minutes) for that post and that reader.
2. After the post has been open for `VIEW_MIN_DWELL_SECONDS` (default 5), the page sends the token back. The browser never sends a number — **counts are never taken from the client**.
3. post-service checks: valid signature, not expired, read long enough, same post, same reader (same account, or same anonymous browser cookie), not a bot (user-agent list; bots get no token at all), not over 60 views/hour for that reader or 300/hour for that network, the post is still published, and the reader is **not the creator** (also when the creator is logged out on a browser they used while logged in).
4. billing-service records the view **once per reader per post per 24-hour window** (`VIEW_DEDUPE_HOURS`) using a unique database index, so refreshes, retries and simultaneous reports can't double count. It then checks: creator's Creator Premium is active, creator not suspended, logged-in reader's account is active, and not more than `VIEW_MAX_ANON_PER_IP_POST_DAY` (default 30) anonymous readers from one network on one post that day.
5. An eligible view writes exactly one **+10 paise** row to the earnings ledger (unique per view) and updates the daily totals. An ineligible view is recorded (for honest view counts) but pays nothing.
6. If billing-service is briefly down, post-service keeps the view and delivers it later (up to 2 days).

The response to the page is always just `{ success: true }`, so nobody can probe which check a view failed.

**Window detail:** the 24-hour dedupe uses fixed windows (00:00 UTC-aligned blocks of `VIEW_DEDUPE_HOURS`), which is what the unique index can enforce exactly. A reader returning on the next window counts again.

## Privacy
- Logged-in readers are identified by account id. Logged-out readers get a random id in a first-party, HttpOnly cookie (`mz_vid`, 1 year) — no personal data, only set when a premium post is opened.
- IP addresses are never stored. Only a salted hash that changes every day is kept, for the per-network abuse check.
- Suggest adding a line about this cookie to the privacy policy page (AdSense reviewers look for it).

## Money states (integer paise everywhere)
| State | Meaning |
|---|---|
| **Estimated** | Eligible views from today (IST). Can still change. |
| **Pending** | Views from the last `EARNINGS_HOLD_DAYS` (default 7) days, waiting to clear fraud checks. |
| **Approved** | Cleared views (older than the hold) minus reversals, plus admin adjustments. |
| **Available** | Approved minus anything held or paid for withdrawals. (Withdrawing needs an active Creator Premium — Phase 7.) |
| **In withdrawal / Paid** | Held for open withdrawal requests / paid out (Phase 7 fills these in). |
| **Reversed / Adjusted** | Views an admin found invalid (removed once each, with a reason) / manual ± corrections with a reason. |

- **Ledger is the truth:** append-only rows (`view_credit`, `view_reversal`, `adjustment`, `withdrawal_hold`, `withdrawal_release`). There is no stored balance number; every balance is computed.
- **Daily totals** per creator/post/day make dashboards fast. A job every 30 minutes rebuilds the last 10 days from the ledger and view events, fixes any difference, and creates any credit a crash left missing. Admins can run it on demand and compare ledger vs totals per creator.
- **Policy when Creator Premium lapses (D3):** posts stay public, views are recorded but **don't earn**; earning resumes on renewal. Balances and history are kept.
- Disclaimer returned with every summary: estimates can change; Creator Premium gives eligibility, not guaranteed earnings.

## API
billing-service, creators (`/api/creator`, needs a creator profile; works after the plan lapses):
- `GET /api/creator/earnings/summary` → views (total, today, this month), all balance states, `earningPaused`, disclaimer
- `GET /api/creator/balance`
- `GET /api/creator/earnings/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD&granularity=day|month&postId=` → gap-filled series of eligible views and earnings (max 1 year; only the caller's own data)
- `GET /api/creator/earnings/ledger?type=&page&limit` (no reader data)

billing-service, admins: `POST /api/billing/admin/earnings/reverse` `{viewEventIds[] | postId, fromDay, toDay, reason}`, `POST /api/billing/admin/earnings/adjust` `{creatorId, amountPaise, reason}`, `POST /api/billing/admin/earnings/reconcile` `{days?, creatorId?}`, `GET /api/billing/admin/creators/:userId/balance` (ledger vs totals). All logged.

billing-service, internal: `POST /internal/views/record`, `POST /internal/earnings/posts`.

post-service: `GET /api/posts/:id` now adds `viewToken` for premium posts; `POST /api/posts/:id/view` `{viewToken}`; `GET /api/posts/premium/mine` now includes per-post `stats {eligibleViews, earnedPaise, approvedPaise, estimatedPaise, lastViewAt}` (from billing; `statsAvailable:false` if billing is unreachable).

## New collections
billing: `viewevents` (unique post+reader+window), `ledgerentries` (unique credit per view, unique reversal per credit), `dailyearnings`. post: `pendingviews` (retry queue, auto-expires after 2 days), `anonlinks` (browser id → account, for self-view detection, auto-expires after 1 year).

## Setup
1. post-service `.env`: `VIEW_TOKEN_SECRET` (long random value). **Counting is off until this is set.** Optional `VIEW_MIN_DWELL_SECONDS`.
2. post-service now trusts 2 proxy hops by default (`TRUST_PROXY_HOPS`) — correct for host nginx → frontend nginx → service. Please confirm the host nginx on the server forwards `X-Forwarded-For` (standard `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`); otherwise all readers look like one network and the per-network cap would stop anonymous earnings early.
3. billing-service `.env` (optional): `VIEW_DEDUPE_HOURS`, `EARNINGS_HOLD_DAYS`, `VIEW_MAX_ANON_PER_IP_POST_DAY`.
4. Migrations: `npm run migrate` in billing-service and post-service (indexes only).
5. The web app must send the token back after the dwell time (Phase 8 adds this to the post page).

## Tests
- billing-service **79 passing** (+16): exactly 10 paise per eligible view, 24-h dedupe, 20 concurrent identical views → 1 credit, self-view, lapsed plan pays nothing, suspended creator / inactive reader, per-network cap, bad viewer keys and future timestamps, estimated → pending → approved over time with ledger = totals, concurrent reversals happen once, adjustments (integer, reason), reconciliation repairs a wrong total and a missing credit, summary/analytics/ledger APIs (no reader data, creators only), no cross-creator analytics, creators/reviewers can't adjust or reverse, internal API secret, per-post stats.
- post-service **62 passing** (+11), real billing in-process: anonymous reader earns 10 paise and refreshes don't add, separate readers/accounts, client can't send counts or reuse tokens across posts/browsers, minimum reading time, bots (still get the post, no token), creator self-views logged in and logged out, 10 simultaneous reports → 1 credit, unpublished and ordinary posts never earn, billing outage → queued and delivered later, per-post stats in the creator list, tracking off without the secret.
- auth-service 6 and quiz-service 23 still passing; all four services build.
