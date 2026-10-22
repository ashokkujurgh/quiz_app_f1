# Phase 5 — LLM screening, Content Reviewer role, review emails, violations

Status: **implemented and tested (backend only).** The reviewer dashboard and creator screens come in Phase 8. Nothing is deployed or committed.

## The flow (plain language)
**draft → submit → plan + restriction check → automatic screening → reviewer queue → email to the assigned reviewer → reviewer approves or rejects with a reason → approved goes live / rejected stays unpublished and the creator is emailed the feedback.**

- **A person always decides.** Screening only advises; it never approves, rejects or counts as a violation.
- **Approval** copies the exact submitted version into a public post (with the premium badge data, SEO fields and a slug). For an edit of a live post, the live version is replaced only now; likes, comments and the URL stay.
- **Rejection** needs a reason (10–1000 characters) that the creator sees. Internal notes and screening results are never shown to the creator or the public.
- If two reviewers act at the same moment, exactly one decision wins; the other gets "already decided".
- Nobody can review their own post, and a creator who is also a reviewer is never assigned their own post.

## Automatic screening
1. **Fixed checks** (always run, even with no AI): keyword stuffing, too many links, link shorteners/plain-http links, promotion (Indian mobile numbers, WhatsApp/Telegram, "join my channel", coupon/referral codes…), view-bait phrases ("refresh this page"…), excessive capitals, repeated paragraphs, and identical text already submitted by another creator.
2. **LLM check** (OpenAI, `OPENAI_VALIDATION_MODEL`, default `gpt-4o-mini`) with a strict JSON schema, including the cover image. It returns `{ relevant, quality_score (0–100), reasons[], recommended_action (approve | review | reject), flags{title_ok, length_ok, spam_or_stuffing, misleading_or_unsafe, likely_copied, promotional, suspicious_links, view_manipulation, image_relevant} }`. The server re-validates every field; anything out of range or missing is treated as malformed. The article text is passed as untrusted data (the prompt tells the model to ignore instructions inside it).
3. Outcomes are stored per revision: `completed`, `error` (`timeout`, `provider_error`, `malformed_output`) or `skipped` (not configured / `PREMIUM_SCREENING_ENABLED=false`). **In every case the post still goes to a reviewer.** Admins can re-run screening (`/rescreen`), e.g. after an outage.

## Reviewers
- New role **Content Reviewer** (`role: 'reviewer'` on the existing user). **Only admins** grant or revoke it (`POST /api/admin/users/:id/reviewer` with a reason); admins can't be demoted and can't change their own role there. Every change is logged (`rolechangelogs`).
- Roles are read from the database on every moderation request, so revoking works instantly (no waiting for the 7-day login token to expire). A forged token role does nothing.
- Reviewers can't reach prices, payments, payouts, credentials or creator accounts (all billing admin endpoints require admin).
- **Assignment:** the active reviewer with the fewest open reviews; if there are no reviewers, an admin; if nobody, the post stays queued and `PREMIUM_REVIEW_EMAIL_FALLBACK` (if set) is emailed. Admins can reassign.
- Everything is in an append-only audit log (`reviewactions`): submitted, withdrawn, screened, assigned, reassigned, approved, rejected, notes, violation confirmed/overturned, appeals.

## Violations (policy)
- A violation exists only when the reviewer, while rejecting, explicitly marks **"confirmed policy violation"** with a category (`irrelevant, low_quality, spam, misleading, unsafe, copied, promotional, view_manipulation, inappropriate_image, other`). Ordinary rejections ("needs more depth"), screening errors and AI suspicion **never** count.
- **1st = Warning 1, 2nd = Warning 2, 3rd and every later one = 30 days without premium submissions.** Blocks stack (a 4th during a block starts when the current one ends). The block is enforced on the submit API (`CREATOR_RESTRICTED` + `restrictedUntil`); drafting is still allowed. The rejection email states the warning level or the block end date.
- Each record keeps: post, reason, category, who confirmed it, when, sequence number, consequence, appeal and any overturn.
- **Violations never expire.** They are never deleted or reset silently.
- **Appeals:** the creator can appeal each violation once. A reviewer (not the one who confirmed it) or an admin can uphold it or overturn it. **Overturn** (also possible without an appeal, with a reason): the violation stops counting, a block it caused is lifted, later stacked blocks move up, the record stays, it's logged and the creator is emailed.
- Two confirmations at the same moment get different sequence numbers (atomic counter).

## Emails
All through the **existing auth-service mailer** and its layout, via a new internal endpoint `POST /internal/email` (outside `/api`, so nginx never exposes it; needs `INTERNAL_SERVICE_SECRET`). Templates: reviewer assigned, post approved, post rejected (with feedback and any warning), violation updated. All data is HTML-escaped.
post-service queues each email in an **outbox** and sends it immediately; if mail is down, decisions still go through and the email is retried with backoff (up to 6 tries). Each email is sent at most once (dedupe key).

## API
post-service — reviewers/admins (`/api/moderation`, nginx routes it to post-service):
- `GET  /queue?status=pending|approved|rejected&mine=true&page&limit` (with screening summary/flags)
- `GET  /:revisionId` — full submission, live version for comparison, screening result, creator profile + submission counts + violation history + block, audit trail
- `POST /:revisionId/approve` `{note?}` · `POST /:revisionId/reject` `{reason, violation?, violationCategory?, note?}`
- `POST /:revisionId/notes` `{note}` · `POST /:revisionId/assign` `{reviewerId}` (admin) · `POST /:revisionId/rescreen` (admin)
- `GET  /history?actorId&creatorId` (reviewers see their own actions; admins all) · `GET /appeals`
- `POST /violations/:id/overturn` `{reason}` · `POST /violations/:id/appeal-decision` `{decision: uphold|overturn, note}`

post-service — creators: `GET /api/posts/premium/standing` (count, level, block, own violations without reviewer identities), `POST /api/posts/premium/violations/:violationId/appeal` `{text}`. `GET /api/posts/premium/:id` now includes each version's rejection feedback.

auth-service — admins: `GET /api/admin/reviewers`, `POST /api/admin/users/:id/reviewer` `{grant, reason}`, `GET /api/admin/users/:id/role-history`.

## New collections
`validationresults`, `reviewactions`, `violations`, `creatorrestrictions`, `creatorstandings`, `emailoutboxes` (post-service); `rolechangelogs` (auth-service). Revisions gain `assignedReviewerId, assignedAt, decidedBy, decisionReason, violationId`. `users.role` now also allows `reviewer` (existing values unchanged).

## Setup
1. Set the same `INTERNAL_SERVICE_SECRET` in auth-, billing-, quiz-, post-service and `agentic/post-creator` (see Phase 4 note).
2. auth-service already has `MAIL_USER` / `MAIL_PASSWORD`. Placeholders: `backend/auth-service/.env.example`.
3. post-service (optional): `PREMIUM_SCREENING_ENABLED`, `OPENAI_VALIDATION_MODEL`, `OPENAI_VALIDATION_TIMEOUT_MS`, `PREMIUM_REVIEW_EMAIL_FALLBACK`. `SITE_URL` (already set in production compose) builds the links in emails.
4. `cd backend/post-service && npm run migrate` (indexes for the new collections).
5. Grant at least one reviewer: `POST /api/admin/users/<id>/reviewer {"grant": true, "reason": "…"}` (admin panel screen in Phase 8).
6. Rebuild auth-service, post-service, frontend and admin (nginx gained `/api/moderation`).

## Tests
- post-service **51 passing** (+27): pipeline (screen → assign → email, nothing public), LLM malformed / out-of-range / provider error / timeout / not configured → stored and still reviewed, strict output validation, fixed checks, admin fallback, fallback email, sweeper recovery, non-staff blocked, revoked reviewer blocked immediately, forged token role ignored, no self-review or self-assignment, reviewers blocked from billing admin, approve publishes the frozen version without leaking moderation data, reject with feedback (notes and AI output hidden from creator), concurrent approve/reject, edit flow keeps the approved version live, reviewer detail + audit trail, 3 confirmed violations → Warning 1/2 → 30-day block enforced, non-violation rejections and AI errors never count, concurrent confirmations, appeal → overturn lifts block and logs, stacked block moves up after overturn, mail outage retried and sent once. The Phase 4 tests now also run with screening off so no test ever calls a real API.
- auth-service **6 passing** (new test setup): admin-only grant/revoke with reason and log, reviewers can't grant, admins protected, reviewer list, internal email secret, escaping, mail-not-configured and unknown recipient.
- billing-service 63 and quiz-service 23 still passing; all four services build.
