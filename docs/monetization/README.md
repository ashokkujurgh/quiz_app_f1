# Meenzo subscriptions, creator monetization & premium content

Everything for this module lives on branch `main-v6`, **not committed and not deployed**. The mobile app was intentionally not changed.

| Doc | Contents |
|---|---|
| [PHASE1_PLAN.md](PHASE1_PLAN.md) | Original plan and the decisions you approved (D1–D7) |
| [PHASE2_SUBSCRIPTIONS.md](PHASE2_SUBSCRIPTIONS.md) | Plans, Razorpay, entitlements — **Razorpay setup guide** |
| [PHASE3_QUOTAS_INVITES.md](PHASE3_QUOTAS_INVITES.md) | Daily limits, game invites — **quota rules** |
| [PHASE4_CREATOR_POSTS.md](PHASE4_CREATOR_POSTS.md) | Creator onboarding, premium posts, uploads, **AI image setup** |
| [PHASE5_REVIEW_VIOLATIONS.md](PHASE5_REVIEW_VIOLATIONS.md) | LLM screening, reviewers, **email setup**, violations policy |
| [PHASE6_VIEWS_EARNINGS.md](PHASE6_VIEWS_EARNINGS.md) | View counting, ledger, money states, analytics |
| [PHASE7_WITHDRAWALS_PAYOUTS.md](PHASE7_WITHDRAWALS_PAYOUTS.md) | Withdrawals, admin payouts — **payout setup guide** |
| [PHASE8_FRONTEND.md](PHASE8_FRONTEND.md) | Screens, end-to-end test, what was checked |
| [FILES_CHANGED.md](FILES_CHANGED.md) | Every file added or changed |

## What's done vs. what needs your configuration
| Area | Built & tested | Needs from you before it works in production |
|---|---|---|
| Plans ₹0 / ₹49 / ₹99, one-time 30-day passes | ✅ | Razorpay keys + webhook (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`). Until then the Plans page says payments aren't set up. |
| Daily limits (1 play + 1 creation for Free), invites | ✅ | `INTERNAL_SERVICE_SECRET` (same value everywhere, see below). Without it limits are **off**. |
| Creator onboarding, premium posts, uploads | ✅ | Nothing new (existing Spaces settings are reused). |
| AI cover images | ✅ | `AI_IMAGE_ENABLED=true` in post-service (uses the existing `OPENAI_API_KEY`). Off by default. |
| LLM screening (advice for reviewers) | ✅ | Uses the existing `OPENAI_API_KEY`; on by default, `PREMIUM_SCREENING_ENABLED=false` to switch off. |
| Reviewer role, review queue, emails | ✅ | Grant at least one reviewer (admin panel → Reviewers). Emails use the existing Hostinger mailer. |
| Violations, warnings, 30-day block, appeals | ✅ | — |
| View counting & earnings | ✅ | `VIEW_TOKEN_SECRET` in post-service. Without it, no views are counted. Confirm the host nginx sends `X-Forwarded-For`. |
| Withdrawals & manual payouts | ✅ | `PAYOUT_ENCRYPTION_KEY` in billing-service (back it up). Without it withdrawals are off. |
| Automatic payouts (RazorpayX) | ❌ not built (manual workflow instead) | Optional later |
| Tax / TDS / PAN collection for creators | ❌ not built | Ask your accountant before paying out at scale |

## Deployment checklist (when you decide to deploy)
1. **Secrets** (generate once, store in a password manager):
   - `INTERNAL_SERVICE_SECRET` — `openssl rand -hex 32`. Put the **same value** in `backend/{auth,billing,quiz,post}-service/.env` **and** the post-creator agent's environment (`agentic/post-creator`). Today they all fall back to a built-in default, so if one is missed, AI posts / quiz result posts / limits / emails break.
   - `VIEW_TOKEN_SECRET` — `openssl rand -hex 32` → `backend/post-service/.env`.
   - `PAYOUT_ENCRYPTION_KEY` — `openssl rand -base64 32` → `backend/billing-service/.env`.
2. **Create `backend/billing-service/.env`** from its `.env.example` (DB_URL, JWT_SECRET same as the other services, Razorpay keys, the secrets above). Compose refuses to start if this file is missing.
3. **Migrations** (indexes and small backfills only; no data is removed): run `npm run migrate` in `backend/billing-service`, `backend/quiz-service`, `backend/post-service`.
4. **Rebuild** with the production overrides: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build billing-service auth-service quiz-service post-service frontend admin`.
5. **Host nginx**: no new routes are needed (`/api/billing`, `/api/creator`, `/api/moderation` are routed inside the frontend/admin containers). Check it forwards `X-Forwarded-For`.
6. **Razorpay** (start in Test mode): webhook URL `https://meenzo.com/api/billing/webhook/razorpay` with events `payment.captured`, `payment.authorized`, `payment.failed`, `order.paid`, `refund.processed`; auto-capture on. Do one test purchase, then switch to Live keys.
7. **Admin panel**: add a reviewer; grant yourself Creator Premium (Subscriptions → Grant) to try the creator flow.
8. Suggested: add a sentence to the privacy policy about the `mz_vid` first-party cookie used to count premium-post views (no personal data).

## Data added
- **billing-service:** `plans`, `usersubscriptions`, `payments`, `webhookevents`, `auditlogs`, `billinglocks`, `usagecounters`, `quotareservations`, `creatorprofiles`, `viewevents`, `ledgerentries`, `dailyearnings`, `payoutmethods`, `withdrawals`
- **post-service:** `premiumposts`, `premiumpostrevisions`, `uploadedassets`, `aiimagecandidates`, `aiimageusages`, `validationresults`, `reviewactions`, `violations`, `creatorrestrictions`, `creatorstandings`, `emailoutboxes`, `pendingviews`, `anonlinks`
- **quiz-service:** `gameinvites`
- **auth-service:** `rolechangelogs`
- **Changed (additive):** `users.role` may now be `reviewer`; `posts` gain `isPremium` / `premium` (absent on existing posts); `quizzes` gain `kind` (`daily`/`custom`, backfilled by the migration).
- Money is integer paise everywhere; balances are computed from the append-only ledger; unique indexes prevent double payments, double credits, double releases and double withdrawals. Works with or without MongoDB transactions (tested both ways).

## Tests
188 automated tests, all passing: auth-service 6 · billing-service 96 · quiz-service 23 · post-service 63 (including the end-to-end purchase → payout journey). The repo had no tests before. Builds pass for all four services, the web app and the admin panel.

## Things I noticed but did not change (follow-ups)
1. `docker-compose.yml` (tracked in git) contains a real SMTP password and DigitalOcean Spaces keys — rotate them and move them to `.env` files.
2. auth-service exposes `/api/auth/users/fcm-tokens`, `/users/fcm-tokens/batch` and `/users/bulk` without login, and `/api/` is public through nginx.
3. Quizzes page: the "Join Now" button on the "quiz is live" pop-up uses an undefined variable (`allQuizzesRef`) and will throw when clicked.
4. The web app's friends/messages state assumes those APIs always succeed; if friend-service or message-service returns an error, the whole layout crashes ("Something went wrong").
5. `GET /api/posts/user/:userId` (profile posts) still lists a user's pending/rejected ordinary posts publicly (only `isActive` is checked). Premium posts are not affected (they are only public once approved). I did fix the same issue on the single-post endpoint.
6. The web app has 30 existing TypeScript errors (no type-check in its build).
7. The mobile app (`web-view-android-app/`, Flutter) has none of these screens yet.
8. Push notifications for premium approvals and creator emails for withdrawal status changes were not added (creators see the status in the dashboard).
