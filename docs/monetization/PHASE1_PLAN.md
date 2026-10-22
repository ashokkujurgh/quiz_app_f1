# Meenzo subscriptions, creator monetization and premium content — Phase 1 plan

Status: **plan only, nothing implemented yet.** Written 2026-10-22 from the code on branch `main-v6`.
The mobile app (`web-view-android-app/`, `mobile_app/`, `meenzo-react-native/`) is out of scope.

---

## 1. What the code looks like today (the parts this module touches)

### Services and how they talk
| Piece | Where | Notes that matter for this work |
|---|---|---|
| auth-service (4001) | `backend/auth-service` | Owns `User` (`role: 'user' \| 'admin'`, `fcmTokens`, `isActive`, `blockedUsers`). Issues JWTs (`{id,email,role}`, 7-day access token, issuer `meenzo-auth`). Has the **only mailer** (`config/mailer.ts`, Hostinger SMTP, `emailLayout()` template), DigitalOcean Spaces uploader (`config/spaces.ts`, multer-s3, 5 MB, mimetype check only), admin routes (`/api/admin/*`, `restrictTo('admin')`). |
| post-service (4004) | `backend/post-service` | `Post` model with `approvalStatus: pending/approved/rejected` (default `approved`), `userType`, `slug`, `seo`, `images[]`, `isAiImage`. Admin approval: `GET /api/posts/admin/pending`, `PATCH /:id/approve`, `PATCH /:id/reject` (no reason stored, no history). Moderation on create: post-filter service + `openAIValidate()` (gpt-4o-mini, JSON parsed by hand, **fails open**). SEO pages + sitemap in `seoController.ts`. Sanitises rich HTML (`utils/html.ts`). |
| quiz-service (4003) | `backend/quiz-service` | `Quiz` (`participation: public/private/invite_only`, `allowedUsers[]`, `scheduleType`, `createdBy`), `GameHistory`, socket game engine (`socket/gameController.ts`, `join_game`). Any logged-in user can `POST /api/quizzes`. Invites = `allowedUsers` set at creation; there is no accept/decline and **`join_game` does not check `invite_only`**. |
| question-service | `backend/question-service` | Practice tests are built **in the browser** from `GET /api/questions` (`PracticeQuizPage.tsx`); no server-side "practice session" exists. |
| agentic/post-creator (Python) | `agentic/post-creator` | OpenAI chat + image generation (`gpt-image-1`, fallbacks OpenArt / KIE), uploads to Spaces, creates posts via `POST /api/posts/internal` as `pending`, then **emails the reviewer** (`notifier.py`, same SMTP account) with a link to admin `/approve/:id`. `daily_games.py` creates the daily public quiz games through the quiz API as an admin. |
| admin panel | `admin/` (React + Tailwind + axios) | Email/password login, admin role only. Pages: Users, Posts (incl. Pending Approval), `ApprovePost`, Quiz, Questions, Topics. |
| web app | `quizapp/` (React + Vite + MUI + Redux + React Router) | `apiFetch` (token refresh), `RichTextEditor` (tiptap), `PostCard`, `EmptyState`, `LoadingSkeleton`, **recharts** already installed, `sonner` toasts. Has a small in-app `AdminDashboard`. |
| routing | `quizapp/nginx.conf`, `admin/nginx.conf` | `/api/posts`, `/api/quizzes`, … go to their service; `/api/` catch-all goes to auth-service. New services need their own `location` before the catch-all. |
| database | one MongoDB at a remote host, shared by every service | Mongoose. No migration tool; indexes are declared in schemas. Several services already read the shared `users` collection. **Whether this Mongo runs as a replica set (needed for multi-document transactions) is unknown — see decision D6.** |
| tests | — | **There are no automated tests anywhere** (no jest/vitest config, `agentic/test` is empty). "Existing regression checks" today = `tsc` builds of each service and `vite build` of both frontends. |

### Things I noticed that affect safety of the new module
These are existing issues; I won't change them unless you say so, but the new code must not depend on them:
1. `docker-compose.yml` (tracked in git) contains a real SMTP password and DO Spaces keys in plain text. They should be rotated and moved to env files. New secrets (Razorpay etc.) will go only in `.env` / `.env.example`.
2. auth-service exposes `/api/auth/users/fcm-tokens`, `/users/fcm-tokens/batch` and `/users/bulk` without auth, and `/api/` is proxied publicly — these may be reachable from the internet.
3. `INTERNAL_SERVICE_SECRET` falls back to the hard-coded `'internal-quiz-secret'` when unset. New internal endpoints will refuse to work if the secret is unset instead.
4. `join_game` ignores `invite_only` (anyone with a quiz id can join).
5. JWT role is trusted for 7 days, so revoking admin has no effect until the token expires. New reviewer/admin endpoints will re-check the role in the DB on every request.

---

## 2. Proposed architecture (reuse first)

### One new service, everything else is extension
**New `billing-service` (port 4008)** owns money and counters — things that need atomic writes and a single owner:
plans, subscriptions, payments & Razorpay webhooks, **the central entitlement/quota service**, creator profiles, view events, the earnings ledger, withdrawals and payouts.

Why a new service rather than stuffing it into auth-service or post-service: it keeps payment code and secrets isolated (only one container gets `RAZORPAY_KEY_SECRET` and the payout encryption key), and quiz-service and post-service both need to ask the same quota questions. It follows the exact same skeleton as the others (Express + helmet + cors + rate-limit + mongoose + `protect` middleware, `{success, message, ...}` responses).

**Extended, not rebuilt:**
| Existing piece | Extension |
|---|---|
| `User` (auth-service) | `role` enum becomes `user \| reviewer \| admin` (existing values stay valid). "Creator" is **not** a stored role — it is derived: active Creator Premium plan + accepted creator profile. Admin-only endpoints to grant/revoke reviewer. |
| auth-service mailer | Keep `emailLayout()`; add templates (reviewer assignment, post approved, post rejected with feedback, payment receipt, withdrawal status, violation warning) and an internal `POST /api/auth/internal/email` endpoint (shared secret, not proxied publicly) so other services send through the **same** mailer instead of copying SMTP code. |
| `Post` (post-service) | New optional fields: `isPremium` (default `false`), `premium: { status, currentRevisionId, liveRevisionId, submittedAt, publishedAt, unpublishedAt, category, tags }`. Existing posts are untouched (`isPremium` absent = ordinary post). Public feed/SEO/sitemap keep working; premium posts appear once approved, with a badge. |
| approval workflow | Premium posts reuse `approvalStatus` for "is it public" plus a richer review flow (queue, assignment, reasons, history). The existing admin "Pending Approval" page keeps working for AI posts; premium posts get their own reviewer queue. |
| `openAIValidate()` | Generalised into a `validatePremiumPost()` that uses OpenAI structured output (JSON schema), timeout, and returns `{relevant, quality_score, reasons, recommended_action}`. Failures become `status: 'error'` → still goes to a human, never auto-rejects, never counts as a violation. The ordinary-post path stays as it is. |
| Spaces storage | post-service gets the same `config/spaces.ts` pattern quiz/message services already copy, plus a **validated** upload: memory buffer → magic-byte sniff (real JPEG/PNG/WebP), size ≤ 5 MB, dimensions via `sharp` (min 600×315, max 4096×4096), re-encode to strip metadata → `PutObject`. |
| AI image | post-service, same OpenAI client and same model env as the agent (`OPENAI_IMAGE_MODELS`, default `gpt-image-1`). Only on explicit click; per-creator daily limit; result held as a temporary "candidate" until accepted, then saved to Spaces. Disabled with a message if `OPENAI_API_KEY` / `AI_IMAGE_ENABLED` are not set. |
| `Quiz` (quiz-service) | New `kind: 'daily' \| 'custom'` (backfilled: quizzes created by admins → `daily`, others → `custom`). `createQuiz` and `join_game` call billing-service for quota. New `GameInvite` model for accept/decline/cancel/expire. |
| `RichTextEditor`, `PostCard`, `RichContent`, recharts, `apiFetch`, MUI theme | Reused for every new web screen. |
| admin panel (`admin/`) | New pages: Payouts, Subscriptions, Creators, Reviewers (grant/revoke), Moderation overview. Reuses its Layout/Sidebar/api client. |

### Where the screens go
- **quizapp (web app):** Plans, My subscription & payment history, Creator onboarding, Creator dashboard, Create/Manage premium posts, Post analytics, Earnings & ledger, Withdraw, Withdrawal history, and the **Reviewer dashboard + moderation detail** (reviewers are normal accounts, often Google sign-in, so they can't use the admin panel's password login).
- **admin panel:** Admin payouts, admin subscription & creator management, reviewer role management, moderation oversight/appeals.

---

## 3. Plans, payments, entitlements (Phase 2)

| | Free ₹0 | Premium ₹49 | Creator Premium ₹99 |
|---|---|---|---|
| Read public posts incl. premium | ✓ | ✓ | ✓ |
| Regular posts (existing moderation) | unlimited | unlimited | unlimited |
| Practice tests | unlimited, no credits | unlimited | unlimited |
| Quiz play credit (daily quiz / invited game) | 1 per IST day | unlimited | unlimited |
| Quiz creation | 1 per IST day | unlimited | unlimited |
| Creator dashboard, premium posts, earnings, withdrawals | — | — | ✓ (eligibility only) |

- Plans live in a `plans` collection seeded from code (prices in **paise**: 0 / 4900 / 9900). Only admins can change them; price shown to users always comes from the server.
- **Payment model (recommended): one-time 30-day pass via Razorpay Orders**, renewed manually; a renewal bought early extends from the current expiry. Razorpay *Subscriptions* (auto-debit) can be added later — the data model has room for it. Reasons: no mandate setup for users, fewer failure states, works for every UPI/card/netbanking user, and needs no extra Razorpay feature activation. See decision D1.
- Flow: `POST /checkout` creates a `Payment` (status `created`, idempotency key) + Razorpay order → Checkout in the browser → `POST /verify` checks the HMAC signature **and** fetches the payment from Razorpay → activates. The webhook (`payment.captured`, `order.paid`, `payment.failed`, `refund.processed`) does the same activation idempotently, so a closed tab still activates. A reconciliation job re-checks `created`/`pending` payments older than 15 min against the Razorpay API.
- Webhook: raw body, `X-Razorpay-Signature` HMAC-SHA256 with `RAZORPAY_WEBHOOK_SECRET`, `WebhookEvent` collection with unique `eventId` (duplicate deliveries are no-ops).
- `UserSubscription` documents are history, never overwritten: `{userId, planId, status: active|expired|cancelled|refunded, startsAt, endsAt, paymentId}`. Current plan = the active one whose `endsAt > now`; none = Free. Expiry needs no job to take effect (it's computed from `endsAt`); a job only flips the status for reporting and sends a reminder.
- Upgrade ₹49 → ₹99 mid-period: ₹99 starts now; unused ₹49 days are converted to ₹99 days by value (e.g. 15 days left → 7 extra days). Refund (from Razorpay dashboard → `refund.processed`) ends that subscription immediately.
- Cancel = "don't remind me / no renewal"; access stays until `endsAt` (nothing auto-renews in the one-time model).
- On expiry the user simply falls back to Free limits. Nothing is deleted.
- If `RAZORPAY_*` are not set, checkout returns `503 "Payments are not configured yet"` and the Plans page shows the plans with a disabled button.

### Central entitlement/quota service
All in billing-service, called by other services over an internal authenticated API; the web app only *reads* it.
- `UsageCounter { userId, istDay: 'YYYY-MM-DD', credit: 'quiz_play'|'quiz_create', used, reserved }`, unique on `(userId, istDay, credit)`.
- `QuotaReservation { userId, credit, istDay, refKey, status: reserved|consumed|released, expiresAt }`, unique on `(userId, credit, refKey)` → the same action twice never costs twice.
- Reserve = one atomic `findOneAndUpdate` with the condition `used + reserved < limit` (`$expr`), upsert-safe via the unique index + retry. Two parallel requests cannot both get the last credit. Paid users/admins/reviewers short-circuit to "allowed" without touching counters.
- IST day computed server-side (UTC+5:30); resets at 00:00 IST.

---

## 4. Quota rules per activity (Phase 3)
| Activity | Free | Paid | When it's charged | Refund/release |
|---|---|---|---|---|
| **Daily quiz** (`kind: 'daily'`, the agent's public games) | uses the 1 `quiz_play` credit | free | on first `join_game` for that quiz (refKey = quizId) — rejoining the same quiz costs nothing | none after joining |
| **Custom quiz creation** (`POST /api/quizzes` by a non-admin) | 1 `quiz_create` per day | free | atomically with creation; released if creation then fails | — |
| **Multiplayer game / invite** (custom quiz with invitees) | uses the same `quiz_play` credit | free | reserved when the invite is **accepted**, consumed when the game starts | released when the invite expires, is declined after accepting, or the host cancels before start |
| **Practice test** | never charged | never charged | — | — |

- Invite create checks the invitee's plan/credit up front; a Free invitee who has used their credit gets: *"You have used your free quiz limit for today. Upgrade to Premium to play unlimited quizzes."* (on invite, accept, and join).
- New `GameInvite { quizId, inviterId, inviteeId, status: pending|accepted|declined|cancelled|expired, reservationId, expiresAt }`, unique on `(quizId, inviteeId)`. Existing `allowedUsers` stays as the list of who may join, so old quizzes keep working.
- `join_game` starts enforcing `invite_only` (only allowed users join) — fixes item 4 above.
- The web app shows "1 of 1 free quiz plays left today" etc. from `GET /api/billing/quota`, and disabled buttons say why.

---

## 5. Creator module (Phase 4)
- **Apply:** a ₹99 user accepts the creator guidelines → `CreatorProfile { userId, displayName, bio, status: active|restricted, acceptedGuidelinesAt }`.
- **Premium post editor:** title, rich text (existing tiptap editor + server sanitiser), category (existing topics/subtopics), tags (max 8), cover image upload or AI image, drafts autosaved, preview, submit.
- **Revisions:** `PremiumPostRevision { postId, version, title, content, images, category, tags, status: draft|submitted|in_review|approved|rejected|superseded }`. The `Post` shows only the *approved live* revision. A substantive edit to a published post creates a new revision that goes through review **while the approved version stays live**; it replaces it only when approved. Any title, content, image, category or tag change counts as substantive (simpler and safer than guessing which edits are "small").
- Unpublish by creator: removes from public pages; earnings history stays.
- **Policy when Creator Premium expires:** published premium posts stay public with their badge; new premium submissions and withdrawals are blocked; balance, ledger and history are kept; **views during the lapse don't earn** (earning resumes on renewal). See decision D3.

## 6. LLM screening, reviewers, violations (Phase 5)
- On submit: plan check → restriction check → LLM screening (with `OPENAI_VALIDATION_TIMEOUT_MS`, default 20 s) → saved as `ValidationResult` → `pending` queue → assigned to the active reviewer with the fewest pending items → email to that reviewer.
- Screening checks: relevance to category, educational quality, title/length, spam & keyword stuffing, misleading/unsafe, likely copied/promotional, suspicious links / view-bait, image relevance. Output validated server-side; anything malformed = `status: 'error'`.
- Screening **never** approves or rejects on its own. The reviewer sees the AI result as advice.
- Reviewer: approve, or reject with a reason (required) and a flag "this is a policy violation" (separate from "needs improvement"). Can't review their own posts. All actions → `ReviewAction` log (who, what, when, notes).
- Emails via the auth-service mailer: assignment (to reviewer), approved, rejected-with-feedback (to creator).
- **Violations:** `Violation { creatorId, postId, reason, confirmedBy, confirmedAt, status: confirmed|overturned, appeal }`. Only reviewer-confirmed ones count; screening errors and AI suspicion alone never count. 1st confirmed → Warning 1, 2nd → Warning 2, 3rd and every later one → 30-day block on premium submissions (`CreatorRestriction { until }`, checked on every submit endpoint). Admins can overturn on appeal (the count drops, the record and the overturn stay). **Violations don't expire** (D4). Nothing is ever reset silently.
- RBAC: reviewer endpoints re-check `role` in the DB. Reviewers can't see prices, payout details, balances or credentials. Only admins grant/revoke reviewer.

## 7. Views, ledger, analytics (Phase 6)
- Only approved, published premium posts by a creator whose plan is active earn.
- Counting: `GET /api/posts/:id` returns a short-lived signed **view token** for premium posts; the page sends `POST /api/posts/:id/view` with it after the post has been visible ~5 s. Server checks: signature, token age, not the creator, viewer not blocked, known bot user-agents excluded, per-IP/per-viewer rate limits. SEO-rendered pages (crawlers) never count.
- Viewer identity: user id when logged in; otherwise a random anonymous id in an HTTP-only cookie (no personal data stored, IP kept only as a short hash for rate limiting).
- `ViewEvent { postId, viewerKey, windowStart }` with a **unique index** → same viewer, same post, same 24 h window (`VIEW_DEDUPE_HOURS`) can never count twice even under concurrency. Window is a fixed bucket per post-viewer (documented).
- Each new event writes exactly one `LedgerEntry { creatorId, type: 'view_credit', amountPaise: 10, sourceId: viewEventId (unique), state }`.
- Money states (all integer paise, all derived from the ledger): **estimated** (first 24 h), **pending** (hold, `EARNINGS_HOLD_DAYS` default 7), **approved** (cleared), **available** (= approved − in-withdrawal, and only while ₹99 is active), **in withdrawal**, **paid**, **reversed/adjusted** (admin entries with reason). A cached `CreatorAccount` totals doc exists for fast reads and atomic withdrawal reservation; a reconciliation job recomputes it from the ledger and alerts on mismatch.
- Analytics: summary cards, posts table, daily/monthly charts (recharts) from server aggregates with date filters. Disclaimer: "Estimated earnings can change after fraud checks."

## 8. Withdrawals and payouts (Phase 7)
- Minimum ₹100 (10000 paise), ≤ available. Methods: bank (holder, account no., IFSC, bank name), UPI (id, name), Amazon gift card (marketplace, delivery email, amount).
- Payout details encrypted at rest (AES-256-GCM, key `PAYOUT_ENCRYPTION_KEY`); UI and admin lists show masked values; the secure admin detail view decrypts and is audit-logged. Gift-card codes and credentials are never logged.
- Request = atomic conditional decrement of `CreatorAccount.availablePaise` + a `withdrawal_hold` ledger entry, with an idempotency key; only one open withdrawal per creator at a time.
- Statuses: Requested → Under Review → Approved → Processing → Paid; or Rejected / Failed / Cancelled (these return the hold to available with a ledger entry). **Paid** requires an external reference (UTR / gift card order id) entered by an admin.
- Manual payout workflow (no payout API): Razorpay subscription money ≠ payouts. If you later enable RazorpayX Payouts, it plugs in as a provider.
- Admin payouts dashboard: pending list, detail, approve/reject with reason, mark processing, record reference, mark paid, CSV export (masked by default).

## 9. API surface (all `{ success, ... }`, paginated lists `?page&limit`)
- `/api/billing`: `GET plans`, `GET subscription`, `POST checkout`, `POST verify`, `POST webhook/razorpay`, `GET payments`, `POST subscription/cancel`, `GET quota`, `GET quota/eligibility?action=`
- internal (shared secret, not proxied): `/internal/quota/reserve|consume|release`, `/internal/entitlements/:userId`
- `/api/creator`: `POST apply`, `GET me`, `GET earnings/summary`, `GET earnings/analytics`, `GET earnings/ledger`, `GET balance`, `PUT payout-details`, `POST withdrawals`, `GET withdrawals`, `GET withdrawals/:id`
- `/api/posts/premium` (post-service): `POST /` (draft), `PATCH /:id`, `POST /:id/submit`, `GET /mine`, `GET /:id/analytics`, `POST /upload`, `POST /ai-image`, `POST /ai-image/:candidateId/accept`, `POST /:id/unpublish`
- `/api/moderation` (post-service): `GET queue`, `GET /:id`, `POST /:id/approve`, `POST /:id/reject`, `GET history`, `POST violations/:id/appeal`, `PATCH violations/:id` (admin)
- `/api/quizzes`: `POST /:id/invites`, `POST invites/:id/accept|decline|cancel`, `GET my/invites`
- `/api/admin/...`: payouts, subscriptions, creators, reviewers (grant/revoke), plans (read-only UI for now)

## 10. New collections & migrations
New: `plans`, `user_subscriptions`, `payments`, `webhook_events`, `usage_counters`, `quota_reservations`, `creator_profiles`, `creator_accounts`, `ledger_entries`, `view_events`, `withdrawals`, `payout_audit_logs`, `premium_post_revisions`, `validation_results`, `review_actions`, `reviewer_assignments`, `violations`, `creator_restrictions`, `game_invites`, `ai_image_candidates`.
Changed (additive only): `users.role` enum, `posts.isPremium/premium`, `quizzes.kind`.
Migration = an idempotent script per service (`npm run migrate`): create indexes, seed plans, backfill `quizzes.kind`. No existing data is modified or removed otherwise. Rollback = the new fields are ignored by old code.

## 11. Testing approach
- Add **jest + ts-jest + supertest + mongodb-memory-server (replica-set mode)** to billing-, post- and quiz-service. Razorpay, OpenAI and SMTP are mocked in tests (no network).
- Each phase ends with: that phase's unit + integration tests, `tsc` build of every touched service, `vite build` of quizapp/admin. Concurrency tests fire parallel requests at quota reserve, view credit and withdrawal.
- Final: end-to-end API test from checkout → webhook → creator apply → post → review → views → withdrawal → paid.

## 12. Env vars to add (placeholders only, in `.env.example`)
`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `INTERNAL_SERVICE_SECRET`, `BILLING_SERVICE_URL`, `PAYOUT_ENCRYPTION_KEY`, `VIEW_TOKEN_SECRET`, `VIEW_DEDUPE_HOURS=24`, `EARNINGS_HOLD_DAYS=7`, `AI_IMAGE_ENABLED`, `AI_IMAGE_DAILY_LIMIT=5`, `OPENAI_VALIDATION_MODEL`, `OPENAI_VALIDATION_TIMEOUT_MS`, `PREMIUM_REVIEW_EMAIL_FALLBACK` (used when no reviewer exists yet).

---

## 13. Decisions I need from you before Phase 2
- **D1 Payment model:** one-time 30-day passes via Razorpay Orders, manual renewal (recommended) — or auto-renewing Razorpay Subscriptions?
- **D2 Free quiz credit:** one shared "quiz play" credit per day covering both the daily quiz and invited multiplayer games (recommended, matches the error message you specified) — or separate credits (Free would then get 2 plays a day)?
- **D3 Lapsed creators:** posts stay live, but views during the lapse don't earn (recommended) — or keep earning and only block withdrawals?
- **D4 Violations:** never expire, admins can overturn on appeal (recommended) — or expire after e.g. 12 months?
- **D5 New service:** OK to add `billing-service` as a new container (recommended), or do you want this inside auth-service?
- **D6 Transactions:** is the production MongoDB a replica set? If yes I'll use transactions in addition to the atomic single-document updates; if not, correctness still holds through conditional updates + unique indexes + reconciliation, but converting it to a single-node replica set is a small, worthwhile change.
- **D7 Reviewer screens** in the web app at `/review` (recommended, reviewers sign in normally) and admin-only screens in the admin panel — OK?
