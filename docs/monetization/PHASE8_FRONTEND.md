# Phase 8 — Screens, end-to-end test, final checks

Status: **implemented, type-checked, built, and partly checked in a browser** (see "What was checked"). Nothing is deployed or committed.

## Web app (quizapp) — new screens
All in the existing MUI style, lazy-loaded (no extra weight on the home page or posts that AdSense crawls), with loading, empty and error states, confirmations for money and review actions, and labelled controls.

| Route | Screen |
|---|---|
| `/plans` | 3 pricing cards, comparison table, current plan, Razorpay Checkout (loaded only here) with success / pending (auto-polling) / failed / cancelled states; "payments not set up" when keys are missing |
| `/subscription` | Current plan, start/end, days left, upcoming periods, expired notice, payment history with statuses and references, renewal-reminder switch, today's quota |
| `/creator` | Onboarding (guidelines + accept) for new creators; dashboard for creators: plan/paused notices, warnings/block banner, summary cards, all balance states, 30-day chart, posts table (thumbnail, status, created, published, views, estimated, approved, updated, actions: view, edit draft, edit & resubmit, analytics, unpublish/republish) |
| `/creator/posts/new`, `/creator/posts/:id` | Premium editor: title, rich text, category/subcategory, tags, cover upload, **Generate AI image** with preview → accept / regenerate / discard and remaining-today count, autosave, preview, checklist, submit (confirm), withdraw, reviewer feedback, review history |
| `/creator/posts/:id/analytics` | Per-post daily/monthly chart with date range |
| `/creator/earnings` | Balance cards, disclaimer, chart with date range, ledger with type filter |
| `/creator/withdraw` | Available balance, reasons when not allowed, saved methods (masked), add UPI / bank / Amazon.in gift card, request with confirmation |
| `/creator/withdrawals` | History with status timeline, rejection/failure reasons, references, cancel |
| `/creator/standing` | Violations, warnings, block end date, appeals |
| `/creator/guidelines` | Guidelines (public) |
| `/review` | Reviewer queue: pending / approved / rejected, "assigned to me", AI suggestion and flags |
| `/review/:revisionId` | Submission (with live-version comparison for edits), screening advice, creator profile + history + violations, audit trail, internal notes, approve (confirm), reject with reason and optional confirmed violation + category |

Changes to existing screens:
- Sidebar: **Plans**, **Creator Studio**, and **Review queue** (reviewers/admins only).
- Post cards and post page: **Premium creator** badge; the post page sends the signed view token after 5.5 s on screen (pauses while the tab is hidden).
- Quizzes page: today's free plays left and a **Game invites** card (accept/decline, with the upgrade message when a Free player has used their play).
- Create quiz: today's free creations left, upgrade prompt on the limit, and which invitees could not be invited.
- Quiz play: the exact limit message with a "See plans" button.
- Theme: disabled primary buttons were unreadable (the brand gradient covered MUI's grey disabled style) — fixed app-wide with one line.

## Admin panel — new pages
| Page | What admins can do |
|---|---|
| **Payouts** | Pending/open list and status filters, detail with creator balances and history, audited full-detail view, review → approve → processing → paid (reference + "delivered" confirmation) or reject/failed with reasons, CSV export (masked), ledger check |
| **Subscriptions** | Payments and plan periods with filters, re-check a payment with Razorpay, grant a plan (user search, days, reason), end a period |
| **Creators** | Creator list, suspend/reinstate (reason), ledger vs dashboard balances, check & repair, manual ± adjustment, reverse fraudulent views for a post and date range |
| **Reviewers** | Add/remove the Content Reviewer role (reason, logged), pending appeals with overturn/uphold |

Optional admin env: `VITE_WEB_URL` (link to the web review queue; defaults to `https://meenzo.com`).

## End-to-end test
`backend/post-service/tests/journey.test.ts` runs the whole journey on the real billing and post services: Free user is refused → buys Creator Premium (Razorpay order → signed webhook) → onboards → uploads a cover and submits → nothing public until a reviewer approves → post is public with the premium flag → 3 views through the real browser flow + 1,000 more → ₹100.30 estimated, ₹0 available → 8 days pass → ₹100.30 approved and available → saves UPI, withdraws ₹100 → admin reviews, approves, processes, opens the audited details, marks paid with a reference → ledger and dashboard agree, withdrawal and earnings reconciliation report no problems.

## What was checked
- Type-check of every new/changed web file (no new errors; the app has 30 pre-existing type errors in other files, unchanged) and `vite build` of the web app; strict `tsc` + build of the admin panel.
- **In a browser** against a throwaway local stack (in-memory database, real billing + post services, seeded demo data — never the real database): Plans, Creator dashboard (numbers verified), editor (in-review state, checklist, image section), Withdraw (₹100 minimum explanation, masked UPI), Review queue and detail including a real rejection through the dialog, and a logged-out reader opening a premium post (badge shown, view counted after the dwell time).
- **Not checked in a browser:** the admin panel pages, the Razorpay Checkout window (needs your test keys), AI image generation (needs the OpenAI key), and the quiz/invite screens (they need quiz-service and its socket, which the local stack didn't run). These are covered by the automated tests on the server side.

## Test totals (all passing)
auth-service 6 · billing-service 96 · quiz-service 23 · post-service 63 (incl. the journey) — **188 tests**. Run each with `npm test` in the service folder (first run downloads a MongoDB binary for the in-memory database).
