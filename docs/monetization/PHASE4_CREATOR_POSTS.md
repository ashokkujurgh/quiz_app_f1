# Phase 4 — Creator onboarding, premium posts, image uploads, AI images

Status: **implemented and tested (backend only).** Screens come in Phase 8. Nothing is deployed or committed.
Screening by the LLM, the reviewer queue, emails and violations come in **Phase 5**. Until then a submitted post waits as "in review" and nothing can publish it.

## In plain language
1. A user on **Creator Premium (₹99)** opens creator onboarding, reads the guidelines and accepts them. That creates their creator profile. Free and ₹49 users get a clear "needs Creator Premium" message.
2. The creator writes a premium post: title, rich text (the existing editor and the server's HTML clean-up), category (existing topics/subtopics), up to 8 tags, a cover image and up to 4 extra images. Drafts save at any time. **Preview** shows the post and a checklist (title 10–150 chars, ≥150 words, category, cover image).
3. **Images**: uploads are checked by decoding the actual bytes (not the file name): JPEG/PNG/WebP only, ≤5 MB, at least 600×315, not animated, not absurdly narrow. They are re-encoded to WebP (max 1600 px wide), which also removes hidden EXIF/GPS data, and stored in the existing DigitalOcean Spaces bucket. A post can only use images uploaded or generated through Meenzo — not outside links.
4. **Generate AI Image** (only when the creator clicks): an LLM writes an image prompt from the title, text and category (no text in the image, no real people or logos), the image model makes it, and the creator sees a **preview** to **accept**, **regenerate** or **discard**. Only an accepted image is attached. Limit: `AI_IMAGE_DAILY_LIMIT` per creator per IST day (default 5); one generation at a time; if the provider fails, the attempt is **not** counted. Unaccepted images are deleted after 24 hours. Off (with a message) unless `AI_IMAGE_ENABLED=true` and the OpenAI key and Spaces are set.
5. **Submit** turns the current draft into a numbered, **frozen revision** that reviewers will judge. Nothing becomes public on submit. Editing the draft afterwards doesn't change what's being reviewed. A creator can **withdraw** a submission before a decision.
6. When a post is approved (Phase 5), a public post is created from that exact revision. Later edits to a live post are submitted as a new revision while the approved version **stays live** until the new one is approved.
7. Creators can **unpublish** a live post (even if their plan has lapsed) and **republish** it later without re-review (needs an active plan). Published premium posts can't be deleted — that would orphan their view and earnings history. Never-submitted drafts can be deleted.

## When Creator Premium expires (policy)
- Published premium posts **stay public** with their badge. (Phase 6: views during the lapse don't earn.)
- New drafts, edits, uploads, AI images, submissions and republishing are **blocked** with the reason; the creator's posts, profile and history remain visible in their dashboard and they can still unpublish.
- Renewing restores everything; nothing is deleted.

## Safety fixes to existing post endpoints
- `PATCH /api/posts/:id` and `DELETE /api/posts/:id`: the owner of a **premium** post gets `409` (edit through review / unpublish instead). Admins keep their existing access. Ordinary posts are unchanged.
- `GET /api/posts/:id`: posts that are not approved (e.g. pending or rejected AI posts) are now visible only to their author and admins. Before, anyone with the id or slug could read them.
- The old admin "Pending Approval" list excludes premium posts (they get their own reviewer queue in Phase 5).

## How it's built
**billing-service:** `CreatorProfile` model (one per user; `active`/`suspended`; accepted guidelines version), versioned guidelines (`src/config/creatorGuidelines.ts`), `creatorStatus()` = Creator Premium active + profile active + current guidelines accepted.

**post-service:**
| Piece | File |
|---|---|
| Private workspace per premium post (draft + status) | `src/models/PremiumPost.ts` |
| Frozen submitted versions (unique per post+version; at most one in review per post) | `src/models/PremiumPostRevision.ts` |
| Validated images a creator owns | `src/models/UploadedAsset.ts` |
| AI candidates + per-day usage/lock | `src/models/AiImage.ts` |
| Public post gets `isPremium` + `premium` meta (set only on approval) | `src/models/Post.ts` |
| Draft/submit/withdraw/unpublish logic and checklist | `src/services/premiumPosts.ts` |
| Byte-level image checks and re-encoding (sharp) | `src/services/imageProcessing.ts` |
| Uploads and AI images | `src/services/premiumImages.ts` |
| Spaces upload/delete | `src/config/spaces.ts` |
| Creator check via billing-service (refuses when billing is off/unreachable) | `src/services/billingClient.ts` |
| Routes (`/api/posts/premium/*`, per-user rate limits) | `src/routes/premium.ts`, `src/controllers/premiumController.ts` |
| Candidate cleanup job | `src/jobs/premiumJobs.ts` |
| `app.ts` split from `server.ts` (for tests); `trust proxy` on | `src/app.ts` |

Status shown to creators (`displayStatus`): `draft`, `in_review`, `rejected`, `published`, `published_edit_in_review`, `published_edit_rejected`, `unpublished`.

## API
billing-service (`/api/creator` is now routed by nginx to billing-service):
- `GET  /api/creator/guidelines` (public)
- `GET  /api/creator/me` → `{ isCreatorPlan, hasProfile, canCreatePremium, reasons[], planEndsAt, profile }`
- `POST /api/creator/apply` `{ displayName?, bio?, acceptGuidelines: true, guidelinesVersion }`
- Admin: `GET /api/billing/admin/creators`, `POST /api/billing/admin/creators/:userId/status` `{status: active|suspended, reason}` (logged)
- Internal: `GET /internal/creators/:userId`

post-service (all need login):
- `GET  /api/posts/premium/meta` — rules, image rules, AI availability and today's remaining, creator status
- `GET  /api/posts/premium/mine?status=draft|in_review|rejected|published|unpublished&page&limit`
- `POST /api/posts/premium` (create draft) · `GET|PATCH|DELETE /api/posts/premium/:id`
- `GET  /api/posts/premium/:id/preview`
- `POST /api/posts/premium/:id/submit | withdraw | unpublish | republish`
- `POST /api/posts/premium/upload` (multipart field `image`) → `{ url, width, height }`
- `POST /api/posts/premium/:id/ai-image` → candidate · `POST .../ai-image/:candidateId/accept` `{setAsCover?}` · `POST .../ai-image/:candidateId/discard`

Error codes the web app can act on: `CREATOR_NOT_ELIGIBLE` (+`reasons`, `upgradeTo`), `CREATOR_FEATURES_OFF`, `BILLING_UNAVAILABLE`, `SUBMISSION_INCOMPLETE` (+`checks`), `ALREADY_IN_REVIEW`, `NO_CHANGES`, `IMAGE_NOT_OWNED`, `IMAGE_INVALID`, `IMAGE_FORMAT`, `IMAGE_TOO_SMALL`, `IMAGE_TOO_LARGE`, `IMAGE_ANIMATED`, `IMAGE_RATIO`, `STORAGE_NOT_CONFIGURED`, `AI_IMAGE_DISABLED`, `AI_IMAGE_LIMIT`, `AI_IMAGE_BUSY`, `AI_IMAGE_FAILED`, `AI_IMAGE_NEEDS_CONTENT`, `PREMIUM_EDIT_VIA_REVIEW`, `PREMIUM_UNPUBLISH_INSTEAD`.

## Setup
1. **Shared secret (important):** today `INTERNAL_SERVICE_SECRET` is unset everywhere, so post-service, quiz-service and `agentic/post-creator` fall back to a built-in default. When you set it, use the **same value** in `backend/billing-service/.env`, `backend/quiz-service/.env`, `backend/post-service/.env` **and** the post-creator agent's environment — otherwise AI posts and quiz result posts stop being created.
2. post-service `.env`: `BILLING_SERVICE_URL` is set by compose; the existing `DO_SPACES_*` and `OPENAI_API_KEY` are reused. To turn on AI images add `AI_IMAGE_ENABLED=true` (optional `AI_IMAGE_DAILY_LIMIT`, `OPENAI_IMAGE_MODELS`, `OPENAI_CHAT_MODEL`). Placeholders are in `backend/post-service/.env.example`.
3. Migration: `cd backend/post-service && npm run migrate` and `cd backend/billing-service && npm run migrate` (indexes only; no data changes).
4. Rebuild `billing-service`, `post-service`, `frontend`, `admin` (nginx changed).
5. post-service now depends on `sharp` (native image library; prebuilt for `node:20-alpine`, no Dockerfile change needed). `sanitize-html`'s parser is ESM-only, which Node ≥20.19 loads fine (unchanged from today).

## Tests
- post-service `npm test` → **24 passing** (real billing-service in-process, real images via sharp, storage and OpenAI faked): Free/₹49 blocked, onboarding required, lapsed plan blocks writes but keeps reads/unpublish, HTML sanitising and tag normalising, foreign/outside images refused, other creators can't read or edit, preview checklist, real image re-encoded to WebP with EXIF removed, fake/GIF/tiny/oversized rejected and nothing stored, incomplete submit refused, revision frozen and nothing public, 5 concurrent submits → 1 revision, withdraw + resubmit, delete rules, owner can't edit/delete a live premium post via the old API, unpublish/republish rules, unapproved posts hidden from the public, AI disabled message, generate→accept, discard deletes, daily limit with failures not counted, concurrent clicks → one generation, expired candidates cleaned, non-creators can't generate.
- billing-service → **63 passing** (+6 creator onboarding tests). quiz-service → **23 passing** (unchanged). `tsc`/`npm run build` pass for billing, quiz, post and auth services.
