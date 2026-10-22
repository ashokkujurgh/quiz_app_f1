# Phase 3 — Daily quotas and game invites

Status: **implemented and tested (backend only).** Web screens that show remaining quota and invite buttons come in Phase 8. Nothing is deployed or committed.

## The rules (plain language)
All days are **IST calendar days** (reset at 00:00 IST = 18:30 UTC). Paid plans (₹49, ₹99) and admins are never limited.

| Activity | Free plan | When it counts | When it's given back |
|---|---|---|---|
| **Daily quiz** (the public games made by admins / the daily-games agent, `kind: 'daily'`) | Uses the **1 quiz play** per day | When you join a running game. Re-joining the same game costs nothing. | Never, once you've played |
| **Multiplayer / invited game** (a user's custom game) | Uses the **same 1 quiz play** | Held when you accept the invite (or wait in the lobby); used when the game starts or when you join a running game | Decline, host cancels, invite expires, game is cancelled/moved, or you leave the lobby before it starts |
| **Creating a custom quiz** (`kind: 'custom'`) | **1 per day** | When the quiz is saved | If saving fails |
| **Practice tests** | Unlimited | Never | — |
| Host playing their own game | Free | Never | — |

- A game scheduled for a **later day** uses that day's credit (so accepting tomorrow's invite doesn't use today's play).
- Message when the Free play is used up (exact): *"You have used your free quiz limit for today. Upgrade to Premium to play unlimited quizzes."* For quiz creation: *"You have used your free quiz creation for today. Upgrade to Premium to create unlimited quizzes."*
- If a plan was active when a credit was held, that game stays free even if the plan expires before it starts.
- If billing-service is configured but unreachable, actions are **refused** with "We couldn't check your quiz limit right now" (never handed out free). If it is not configured at all (`BILLING_SERVICE_URL` / `INTERNAL_SERVICE_SECRET` empty), limits are **off** and the service logs a warning — this keeps local development working; production must set both.

## Behaviour changes to existing features
- **Invite-only and private games are now actually restricted** to invited players, the host and admins (previously anyone with the link could join).
- Creating a quiz with `allowedUsers` now runs each person through the invite flow. A Free user who has already used today's play is **not** added, and the response's `inviteResults` says why. If billing is unreachable, the old behaviour (add everyone) is kept and the check happens when they join.
- When joining is refused, the game socket sends the existing `game_error` event with `{ message, code, upgradeTo }`, so today's web app already shows the message. Codes: `QUOTA_EXCEEDED`, `QUOTA_UNAVAILABLE`, `NOT_INVITED`, `GAME_ENDED`, `NOT_FOUND`.

## How it's built
**billing-service** (the one central quota service):
- `UsageCounter` — one row per user / IST day / credit with `used` and `reserved`, unique index. Taking a credit is one atomic conditional update (`used + reserved < limit`), so simultaneous requests can't both get the last credit.
- `QuotaReservation` — one row per user / credit / action (`refKey`), unique index. Repeating the same action never costs twice. States: reserved → consumed, or reserved → released.
- Jobs: release reservations past their expiry (every 2 min); rebuild counters from reservation rows (every 15 min) in case of a crash between writes.
- Works with or without MongoDB transactions (tested both ways).

**quiz-service:**
- `src/services/billingClient.ts` — calls billing's internal API.
- `src/services/quotaKeys.ts` — credit key per game occurrence (`play:<quizId>:<start time>`, so recurring games charge per occurrence), expiry and credit day.
- `src/models/GameInvite.ts`, `src/services/inviteService.ts`, `src/controllers/inviteController.ts` — invites.
- `src/services/occurrence.ts` — when a game finishes, is cancelled, deleted or moved: unused held credits go back and open invites close.
- `src/socket/gameController.ts` — `admitPlayer()` runs before anyone enters a game room; lobby credits are used when the game starts and given back if a player leaves the lobby.
- `Quiz.kind` (`daily` | `custom`); `src/app.ts` split out of `server.ts` so tests can load the app.

## API
billing-service (web app):
- `GET /api/billing/quota` → plan, IST day, `resetsAt`, per-credit `{limit, used, reserved, remaining, unlimited}`, `practice: {unlimited: true, consumesCredits: false}`
- `GET /api/billing/quota/eligibility?action=quiz_play|quiz_create` → `{allowed, remaining, code?, message?, upgradeTo?}`

billing-service (internal only, header `x-internal-secret`, not proxied by nginx):
`GET /internal/quota/:userId/eligibility?credit=&forDay=`, `POST /internal/quota/reserve|consume|release|release-ref` `{userId, credit, refKey, expiresAt?, forDay?, reason?}`

quiz-service:
- `POST /api/quizzes` — now returns `inviteResults`; 403 `QUOTA_EXCEEDED` for a second Free creation
- `POST /api/quizzes/:id/invites` `{userIds}` (host/admin) → per-user `invited | already_invited | blocked | invalid`
- `GET  /api/quizzes/:id/invites` (host/admin)
- `GET  /api/quizzes/my/invites` → my open invites with `canPlay`
- `POST /api/quizzes/invites/:inviteId/accept | decline` (invitee), `/cancel` (host/admin)

## Migration
1. Set the same long random `INTERNAL_SERVICE_SECRET` in `backend/billing-service/.env` and `backend/quiz-service/.env` (compose already sets `BILLING_SERVICE_URL` for quiz-service).
2. `cd backend/quiz-service && npm run migrate` — labels existing quizzes `daily`/`custom` and builds the invite indexes. `cd backend/billing-service && npm run migrate` builds the quota indexes.
3. Rebuild `billing-service` and `quiz-service`.

## Tests
- billing-service: `npm test` → **57 passing** (34 from Phase 2, 22 quota tests, 1 quota race test without transactions): IST rollover, one Free play then the exact message, replay free, separate create credit, reserve/release, consumed never released, 20 concurrent different-game requests → 1 success, 20 concurrent same-game requests → all OK and 1 credit, next-day reset, expiry release, release-by-game, counter repair, Premium/admin never blocked, expired Premium back to Free limits, quota API, no practice credit, internal secret, no public release endpoint, later-day credits.
- quiz-service: `npm test` → **23 passing**, running the real billing-service in-process on the same in-memory DB: Free creation limit, Premium/admin unlimited, failed creation refunded, 8 concurrent creations → 1, fail-closed when billing is down, daily-quiz play limit with the exact message over the live socket, Premium unlimited, quota visible, lobby hold/release, invite-only access, host plays free, invite blocked with the exact message, paid invitee OK, accept holds / decline frees, second accept refused, 4 concurrent accepts → 1, host cancel frees + removes, expiry frees, game cancel frees all, invitee joining uses the held credit, invite list, invites on create.
- Regression: `tsc` + `npm run build` pass for quiz-service; auth-service and post-service unchanged. The repo had no tests before this work.
