# Phase 2 — Plans, Razorpay payments, entitlements

Status: **implemented and tested (backend only).** The web screens come in Phase 8. Nothing is deployed or committed.
Decisions used (all recommended options): D1 one-time 30-day passes · D2 one shared Free "quiz play" credit · D3 lapsed creators keep posts, no earnings during lapse · D4 violations don't expire · D5 new billing-service · D6 transactions when available, correct without them · D7 reviewer screens in the web app.

## What was built
A new service, `backend/billing-service` (port 4008, host port 7211, container `quizhub-billing`), in the same style as the other services.

| Piece | File |
|---|---|
| Plan catalogue (Free ₹0 / Premium ₹49 / Creator Premium ₹99, prices in paise) | `src/config/plans.ts`, `src/models/Plan.ts` |
| Subscription periods (history, never deleted) | `src/models/UserSubscription.ts` |
| Payments + Razorpay ids + event trail | `src/models/Payment.ts` |
| Webhook de-duplication | `src/models/WebhookEvent.ts` |
| Audit log for admin actions | `src/models/AuditLog.ts` |
| Razorpay REST client + signature checks | `src/services/razorpay.ts` |
| Checkout, verify, webhook, reconciliation | `src/services/payments.ts` |
| Renewal stacking, upgrade conversion, refunds, grants, expiry | `src/services/subscriptions.ts` |
| **Central entitlement service** (what a user may do right now) | `src/services/entitlements.ts` |
| Per-user lock, transaction helper | `src/services/lock.ts`, `src/services/tx.ts` |
| Jobs: reconcile every 5 min, expiry flag hourly | `src/jobs/scheduler.ts` |
| Migration (seed plans, build indexes) | `src/scripts/migrate.ts` |

Also changed: `docker-compose.yml`, `docker-compose.prod.yml` (new service), `quizapp/nginx.conf` and `admin/nginx.conf` (`/api/billing` → billing-service).

## How payment works (plain language)
1. The user picks a plan. The server creates a Razorpay order for the price **stored on the server** (the request can't change the price).
2. Razorpay Checkout opens in the browser. This is a **one-time payment for 30 days; it does not renew automatically.**
3. When the browser says "paid", the server checks the signature **and** asks Razorpay directly whether the money was captured and the amount matches. Only then does the plan start.
4. Razorpay also calls our webhook. That activates the plan too, so closing the tab after paying is fine.
5. Every 5 minutes a job re-checks unfinished payments with Razorpay (missed webhooks, closed tabs) and marks orders never paid after 24 h as expired.
6. Verify, webhooks and the job can all run at the same time for the same payment — exactly one 30-day period is created (unique index + per-user lock + transaction when available).

| Situation | Result |
|---|---|
| Renew early | New 30 days start when the current period ends |
| Upgrade ₹49 → ₹99 | ₹99 starts now; unused ₹49 days are converted by value (15 days → ~7.4 days) |
| Buy ₹49 while on ₹99 | Queued after the ₹99 period |
| Payment failed | Status `failed` with the bank's reason; retry on the same order still works |
| Checkout closed | Status `cancelled`; if Razorpay actually took the money, reconciliation activates it |
| Full refund (from Razorpay dashboard) | Period ends at once, user back on Free |
| Partial refund | Recorded; access kept |
| Expiry | Free limits apply the moment the period ends; nothing is deleted |
| "Cancel" | Turns off renewal reminders; access stays until the end date (nothing auto-charges) |
| Buying more than ~13 months ahead | Refused with a clear message |

## API (all responses `{ success, ... }`)
Public / user (`Authorization: Bearer <JWT>`):
- `GET  /api/billing/plans` — plans, `paymentsEnabled`, billing note
- `GET  /api/billing/subscription` — entitlements, `status` (`active`/`expired`/`free`), `daysLeft`, history, open payment
- `GET  /api/billing/entitlements`
- `POST /api/billing/checkout` `{ planCode, idempotencyKey? }` → Razorpay Checkout options (`keyId`, `orderId`, amount, prefill)
- `POST /api/billing/verify` `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` → 200 paid / 202 still pending or failed
- `GET  /api/billing/payments?page&limit` — payment history
- `GET  /api/billing/payments/:id` — status poll (re-checks Razorpay for unfinished payments)
- `POST /api/billing/payments/:id/cancel` — user closed checkout
- `POST /api/billing/subscription/cancel`

Webhook: `POST /api/billing/webhook/razorpay` (raw body, `X-Razorpay-Signature`).

Admin (role re-checked in the database on every call):
`GET /api/billing/admin/payments`, `POST /api/billing/admin/payments/:id/reconcile`, `GET /api/billing/admin/subscriptions`, `POST /api/billing/admin/subscriptions/grant` `{userId, planCode, days, reason}`, `POST /api/billing/admin/subscriptions/:id/revoke` `{reason}`, `GET /api/billing/admin/users/:userId/entitlements`.

Internal (not proxied; header `x-internal-secret`): `GET /internal/entitlements/:userId`.

## Razorpay setup guide
1. Razorpay Dashboard → **Account & Settings → API Keys** → generate (start in **Test mode**). Put the Key Id and Secret in `backend/billing-service/.env` as `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
2. **Account & Settings → Webhooks → Add**: URL `https://meenzo.com/api/billing/webhook/razorpay`, choose a secret (put it in `RAZORPAY_WEBHOOK_SECRET`), events: `payment.captured`, `payment.authorized`, `payment.failed`, `order.paid`, `refund.processed`.
3. **Payment capture**: set to automatic (the server also captures authorized payments itself as a fallback).
4. Test with Razorpay test cards/UPI, then switch to Live keys.
Until keys are set, checkout answers `503 "Online payments are not set up yet."` and webhooks are rejected.

## Deploying (when you say so)
1. `cp backend/billing-service/.env.example backend/billing-service/.env` on the server and fill it in (**compose fails to start the stack if this file is missing**).
2. `cd backend/billing-service && npm run migrate` (or let the service seed plans on boot; indexes are built automatically by Mongoose too).
3. `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build billing-service frontend admin`.
The host nginx needs no change: `/api/billing` is routed inside the frontend/admin containers.

## Tests
`cd backend/billing-service && npm test` — 34 tests, in-memory MongoDB (replica set, plus one standalone run to prove correctness without transactions), Razorpay faked. Covers: plan prices, Free/paid/admin limits, server-side pricing, idempotent checkout, forged signatures, uncaptured/mismatched payments, cross-user verify, auto-capture, bad webhook signature, webhook-only activation, duplicate webhooks, 4-way concurrent activation, failed then successful retry, full/partial refunds, foreign orders, renewal stacking, upgrade conversion, expiry fallback with history kept, prepaid limit, interrupted checkout, order expiry, DB-checked admin role, admin grant, internal secret, no secrets in responses.

Regression: the repo has no automated tests; `tsc` of auth-service and post-service passes (unchanged). quiz-service has no local `node_modules`, so it was not type-checked here (it is unchanged in this phase).
