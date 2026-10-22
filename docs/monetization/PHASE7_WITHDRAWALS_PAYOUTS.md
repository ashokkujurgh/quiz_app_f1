# Phase 7 — Withdrawals and admin payouts

Status: **implemented and tested (backend only).** Creator and admin screens come in Phase 8. Nothing is deployed or committed.

## Plain language
- **Payouts are manual.** Razorpay subscriptions collect money; they don't pay creators. An admin pays each approved withdrawal by bank transfer, UPI or an Amazon.in gift card outside Meenzo, then records the payment reference. (If you later enable RazorpayX Payouts, it can plug in as a provider; `payoutProvider` is `manual` today.)
- A creator saves up to 3 payout methods: **bank** (holder, account number, IFSC, bank name), **UPI** (UPI ID, name) or **Amazon.in gift card** (delivery email; amount = the withdrawal amount, whole rupees). Details are checked on the server, **stored only encrypted** (AES-256-GCM, `PAYOUT_ENCRYPTION_KEY`) and **always shown masked** (e.g. `••••••••9012`, `as••••@okaxis`). A withdrawal keeps a frozen copy, so later edits don't change a request in progress.
- **Withdrawing:** minimum **₹100**, never more than the **available** (cleared) balance, whole paise only. Needs an active Creator Premium plan and an active creator account; when the plan has lapsed the balance is kept and withdrawing works again after renewal.
- The amount is **held immediately** in the ledger, so it can't be spent twice. Requests are processed one at a time per creator, computed from the ledger itself, and the database allows **only one open withdrawal per creator**. A repeated click with the same idempotency key returns the same request.
- **Statuses:** Requested → Under Review → Approved → Processing → **Paid**; or Rejected / Failed / Cancelled.
  - Creators can cancel while Requested or Under Review.
  - Admins can reject (with a reason) until Processing; a payout that bounces is marked **Failed** (with a reason).
  - Rejected, Failed and Cancelled **return the money exactly once** (a unique ledger row per withdrawal).
  - **Paid** is only possible from Processing, with a payment reference (UTR / UPI ref / gift card order id) **and** an explicit "the money or gift card was delivered" confirmation. It can never be set earlier.
- Every status change is in the withdrawal's history and the audit log (who, when, note).

## Admin payout dashboard (API; screens in Phase 8)
- Pending list (`status=open`), filters by status/creator, oldest first.
- Detail: masked destination, history, the creator's balances from the ledger, previous withdrawals.
- **Secure view** of the full destination: decrypted on request, only for open withdrawals, response marked `no-store`, and every view is audit-logged.
- Actions: review, approve, reject (reason), process, paid (reference + confirmation), failed (reason).
- **CSV export** (masked destinations only, formula-injection safe, audit-logged).
- An admin can't act on their own withdrawal. Reviewers and creators get 403 on all of this.
- Nothing logs full account numbers, UPI IDs, gift card codes or emails (tests check the database and audit log).

## Balances after this phase
`available = approved − in withdrawal − paid`. `inWithdrawal` = open requests, `paid` = paid requests; both come from the withdrawal records and match the ledger holds/releases. A job (hourly) and an admin endpoint check that every withdrawal has its hold, and a release only if it was rejected/failed/cancelled.

## API
Creators (`/api/creator`):
- `GET|POST /payout-methods` `{type, details}` · `DELETE /payout-methods/:id`
- `GET /withdrawals/eligibility` → `{canWithdraw, reasons[], availablePaise, minPaise, balances}`
- `POST /withdrawals` `{amountPaise, payoutMethodId, idempotencyKey}` · `GET /withdrawals` · `GET /withdrawals/:id` · `POST /withdrawals/:id/cancel`

Admins (`/api/billing/admin`):
- `GET /withdrawals?status=open|requested|…&creatorId&page&limit` · `GET /withdrawals/:id`
- `GET /withdrawals/:id/payout-details` (secure view)
- `POST /withdrawals/:id/review|approve|reject|process|paid|failed` (`reason`, `payoutReference`, `confirmFulfilled`, `note`)
- `GET /withdrawals/export.csv?status&from&to` · `POST /withdrawals/reconcile`

Error codes: `BELOW_MINIMUM`, `INSUFFICIENT_BALANCE`, `NOT_ELIGIBLE` (+`reasons`), `PAYOUTS_NOT_CONFIGURED`, `BAD_TRANSITION`, `CONFIRM_FULFILMENT`, `SELF_PAYOUT`, `CONFLICT`.

## Payout setup guide
1. Generate the key once: `openssl rand -base64 32` → `PAYOUT_ENCRYPTION_KEY` in `backend/billing-service/.env`. **Back it up safely** (password manager); without it saved payout details can't be read. To rotate: move the old key to `PAYOUT_ENCRYPTION_KEY_PREVIOUS`, set a new `PAYOUT_ENCRYPTION_KEY`; new details use the new key, old ones still open.
2. `cd backend/billing-service && npm run migrate` (indexes, incl. one-open-withdrawal and one-release-per-withdrawal).
3. Paying out: open the request → Review → Approve → open the secure view → pay from the company bank/UPI or buy the Amazon.in gift card → Processing → once the bank/Amazon confirms delivery, mark **Paid** with the UTR / order id. If it bounces, mark **Failed** — the creator's balance is restored.
4. Tax/KYC (TDS, PAN) is not handled here; check with your accountant before paying out at scale.

## Tests
billing-service **96 passing** (+17): detail validation for all three methods, encrypted at rest (raw DB and audit log contain no account number), masked responses, disabled without a key, below ₹100 / above balance / fractional refused, uncleared earnings not withdrawable, immediate hold and one-open rule, **10 concurrent requests → one withdrawal, no overdraw**, idempotent double click, lapsed plan and suspended creator blocked (balance kept), full happy path to Paid with reference + confirmation, **never Paid before Processing**, rejected and failed return money exactly once (concurrent rejects) and reconcile clean, creator cancel rules, RBAC (creator, reviewer, self-payout), audited no-store secure view, masked injection-safe CSV, ledger = dashboard numbers.
auth 6, quiz 23, post 62 still passing; all services build.
