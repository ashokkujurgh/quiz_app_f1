# Files changed by the monetization module

`A` = added, `M` = modified. `package-lock.json` files also changed where dependencies were added (billing-, auth-, post-, quiz-service). No files were deleted.

## billing-service (new) (63)

- `A` backend/billing-service/.env.example
- `A` backend/billing-service/Dockerfile
- `A` backend/billing-service/package.json
- `A` backend/billing-service/src/app.ts
- `A` backend/billing-service/src/config/creatorGuidelines.ts
- `A` backend/billing-service/src/config/db.ts
- `A` backend/billing-service/src/config/earnings.ts
- `A` backend/billing-service/src/config/plans.ts
- `A` backend/billing-service/src/controllers/adminController.ts
- `A` backend/billing-service/src/controllers/billingController.ts
- `A` backend/billing-service/src/controllers/creatorController.ts
- `A` backend/billing-service/src/controllers/earningsController.ts
- `A` backend/billing-service/src/controllers/internalController.ts
- `A` backend/billing-service/src/controllers/quotaController.ts
- `A` backend/billing-service/src/controllers/webhookController.ts
- `A` backend/billing-service/src/controllers/withdrawalController.ts
- `A` backend/billing-service/src/jobs/scheduler.ts
- `A` backend/billing-service/src/middleware/auth.ts
- `A` backend/billing-service/src/models/AuditLog.ts
- `A` backend/billing-service/src/models/BillingLock.ts
- `A` backend/billing-service/src/models/CreatorProfile.ts
- `A` backend/billing-service/src/models/DailyEarning.ts
- `A` backend/billing-service/src/models/LedgerEntry.ts
- `A` backend/billing-service/src/models/Payment.ts
- `A` backend/billing-service/src/models/PayoutMethod.ts
- `A` backend/billing-service/src/models/Plan.ts
- `A` backend/billing-service/src/models/QuotaReservation.ts
- `A` backend/billing-service/src/models/UsageCounter.ts
- `A` backend/billing-service/src/models/User.ts
- `A` backend/billing-service/src/models/UserSubscription.ts
- `A` backend/billing-service/src/models/ViewEvent.ts
- `A` backend/billing-service/src/models/WebhookEvent.ts
- `A` backend/billing-service/src/models/Withdrawal.ts
- `A` backend/billing-service/src/routes/billing.ts
- `A` backend/billing-service/src/routes/creator.ts
- `A` backend/billing-service/src/routes/internal.ts
- `A` backend/billing-service/src/scripts/migrate.ts
- `A` backend/billing-service/src/server.ts
- `A` backend/billing-service/src/services/creators.ts
- `A` backend/billing-service/src/services/earnings.ts
- `A` backend/billing-service/src/services/entitlements.ts
- `A` backend/billing-service/src/services/lock.ts
- `A` backend/billing-service/src/services/payments.ts
- `A` backend/billing-service/src/services/payoutDetails.ts
- `A` backend/billing-service/src/services/plans.ts
- `A` backend/billing-service/src/services/quota.ts
- `A` backend/billing-service/src/services/razorpay.ts
- `A` backend/billing-service/src/services/secretBox.ts
- `A` backend/billing-service/src/services/subscriptions.ts
- `A` backend/billing-service/src/services/tx.ts
- `A` backend/billing-service/src/services/withdrawals.ts
- `A` backend/billing-service/src/utils/errors.ts
- `A` backend/billing-service/src/utils/http.ts
- `A` backend/billing-service/src/utils/ist.ts
- `A` backend/billing-service/tests/creator.test.ts
- `A` backend/billing-service/tests/earnings.test.ts
- `A` backend/billing-service/tests/fakeRazorpay.ts
- `A` backend/billing-service/tests/noTransactions.test.ts
- `A` backend/billing-service/tests/quota.test.ts
- `A` backend/billing-service/tests/setup.ts
- `A` backend/billing-service/tests/subscriptions.test.ts
- `A` backend/billing-service/tests/withdrawals.test.ts
- `A` backend/billing-service/tsconfig.json

## auth-service (11)

- `A` backend/auth-service/.env.example
- `M` backend/auth-service/package.json
- `M` backend/auth-service/src/config/mailer.ts
- `M` backend/auth-service/src/controllers/adminController.ts
- `A` backend/auth-service/src/models/RoleChangeLog.ts
- `M` backend/auth-service/src/models/User.ts
- `M` backend/auth-service/src/routes/admin.ts
- `A` backend/auth-service/src/routes/internal.ts
- `M` backend/auth-service/src/server.ts
- `M` backend/auth-service/src/types/index.ts
- `A` backend/auth-service/tests/reviewerAndEmail.test.ts

## post-service (44)

- `A` backend/post-service/.env.example
- `M` backend/post-service/package.json
- `A` backend/post-service/src/app.ts
- `A` backend/post-service/src/config/spaces.ts
- `A` backend/post-service/src/controllers/moderationController.ts
- `M` backend/post-service/src/controllers/postController.ts
- `A` backend/post-service/src/controllers/premiumController.ts
- `A` backend/post-service/src/jobs/premiumJobs.ts
- `A` backend/post-service/src/models/AiImage.ts
- `A` backend/post-service/src/models/AnonLink.ts
- `A` backend/post-service/src/models/EmailOutbox.ts
- `A` backend/post-service/src/models/PendingView.ts
- `M` backend/post-service/src/models/Post.ts
- `A` backend/post-service/src/models/PremiumPost.ts
- `A` backend/post-service/src/models/PremiumPostRevision.ts
- `A` backend/post-service/src/models/ReviewAction.ts
- `A` backend/post-service/src/models/UploadedAsset.ts
- `A` backend/post-service/src/models/User.ts
- `A` backend/post-service/src/models/ValidationResult.ts
- `A` backend/post-service/src/models/Violation.ts
- `A` backend/post-service/src/routes/moderation.ts
- `M` backend/post-service/src/routes/posts.ts
- `A` backend/post-service/src/routes/premium.ts
- `A` backend/post-service/src/scripts/migrate.ts
- `M` backend/post-service/src/server.ts
- `A` backend/post-service/src/services/billingClient.ts
- `A` backend/post-service/src/services/emailOutbox.ts
- `A` backend/post-service/src/services/imageProcessing.ts
- `A` backend/post-service/src/services/moderation.ts
- `A` backend/post-service/src/services/premiumImages.ts
- `A` backend/post-service/src/services/premiumPosts.ts
- `A` backend/post-service/src/services/screening.ts
- `A` backend/post-service/src/services/tx.ts
- `A` backend/post-service/src/services/viewTracking.ts
- `A` backend/post-service/src/services/violations.ts
- `A` backend/post-service/src/utils/errors.ts
- `A` backend/post-service/src/utils/http.ts
- `A` backend/post-service/src/utils/ist.ts
- `A` backend/post-service/src/utils/slug.ts
- `A` backend/post-service/tests/harness.ts
- `A` backend/post-service/tests/journey.test.ts
- `A` backend/post-service/tests/moderation.test.ts
- `A` backend/post-service/tests/premium.test.ts
- `A` backend/post-service/tests/views.test.ts

## quiz-service (20)

- `A` backend/quiz-service/.env.example
- `M` backend/quiz-service/package.json
- `A` backend/quiz-service/src/app.ts
- `A` backend/quiz-service/src/controllers/inviteController.ts
- `M` backend/quiz-service/src/controllers/quizController.ts
- `M` backend/quiz-service/src/jobs/scheduler.ts
- `A` backend/quiz-service/src/models/GameInvite.ts
- `M` backend/quiz-service/src/models/Quiz.ts
- `A` backend/quiz-service/src/models/User.ts
- `M` backend/quiz-service/src/routes/quiz.ts
- `A` backend/quiz-service/src/scripts/migrate.ts
- `M` backend/quiz-service/src/server.ts
- `A` backend/quiz-service/src/services/billingClient.ts
- `A` backend/quiz-service/src/services/inviteService.ts
- `A` backend/quiz-service/src/services/occurrence.ts
- `A` backend/quiz-service/src/services/quotaKeys.ts
- `M` backend/quiz-service/src/socket/gameController.ts
- `A` backend/quiz-service/src/utils/ist.ts
- `A` backend/quiz-service/tests/harness.ts
- `A` backend/quiz-service/tests/quotaAndInvites.test.ts

## Web app (quizapp) (34)

- `M` quizapp/nginx.conf
- `M` quizapp/src/app/components/layout/LeftSidebar.tsx
- `A` quizapp/src/app/components/monetization/BalanceCards.tsx
- `A` quizapp/src/app/components/monetization/EarningsChart.tsx
- `A` quizapp/src/app/components/monetization/GameInvitesCard.tsx
- `A` quizapp/src/app/components/monetization/PremiumBadge.tsx
- `A` quizapp/src/app/components/monetization/QuotaBanner.tsx
- `A` quizapp/src/app/components/monetization/RangePicker.tsx
- `A` quizapp/src/app/components/monetization/StatusChip.tsx
- `A` quizapp/src/app/components/monetization/UpgradePrompt.tsx
- `M` quizapp/src/app/components/pages/CreateQuizPage.tsx
- `M` quizapp/src/app/components/pages/HomePage.tsx
- `M` quizapp/src/app/components/pages/PostDetailPage.tsx
- `M` quizapp/src/app/components/pages/QuizPlayPage.tsx
- `M` quizapp/src/app/components/pages/QuizzesPage.tsx
- `A` quizapp/src/app/components/pages/monetization/CreatorHubPage.tsx
- `A` quizapp/src/app/components/pages/monetization/CreatorStandingPage.tsx
- `A` quizapp/src/app/components/pages/monetization/EarningsPage.tsx
- `A` quizapp/src/app/components/pages/monetization/PlansPage.tsx
- `A` quizapp/src/app/components/pages/monetization/PostAnalyticsPage.tsx
- `A` quizapp/src/app/components/pages/monetization/PremiumPostEditorPage.tsx
- `A` quizapp/src/app/components/pages/monetization/ReviewDetailPage.tsx
- `A` quizapp/src/app/components/pages/monetization/ReviewQueuePage.tsx
- `A` quizapp/src/app/components/pages/monetization/SubscriptionPage.tsx
- `A` quizapp/src/app/components/pages/monetization/WithdrawPage.tsx
- `A` quizapp/src/app/components/pages/monetization/WithdrawalsPage.tsx
- `M` quizapp/src/app/components/shared/PostCard.tsx
- `M` quizapp/src/app/hooks/useQuizSocket.ts
- `A` quizapp/src/app/hooks/useViewReporter.ts
- `M` quizapp/src/app/router/index.tsx
- `M` quizapp/src/app/theme/muiTheme.ts
- `M` quizapp/src/app/types/index.ts
- `A` quizapp/src/app/utils/monetization.ts
- `A` quizapp/src/app/utils/razorpay.ts

## Admin panel (10)

- `M` admin/nginx.conf
- `M` admin/src/App.tsx
- `M` admin/src/components/Sidebar.tsx
- `A` admin/src/components/UserPicker.tsx
- `A` admin/src/components/ui.tsx
- `A` admin/src/lib/money.ts
- `A` admin/src/pages/Creators.tsx
- `A` admin/src/pages/Payouts.tsx
- `A` admin/src/pages/Reviewers.tsx
- `A` admin/src/pages/Subscriptions.tsx

## Documentation (10)

- `A` docs/monetization/PHASE1_PLAN.md
- `A` docs/monetization/PHASE2_SUBSCRIPTIONS.md
- `A` docs/monetization/PHASE3_QUOTAS_INVITES.md
- `A` docs/monetization/PHASE4_CREATOR_POSTS.md
- `A` docs/monetization/PHASE5_REVIEW_VIOLATIONS.md
- `A` docs/monetization/PHASE6_VIEWS_EARNINGS.md
- `A` docs/monetization/PHASE7_WITHDRAWALS_PAYOUTS.md
- `A` docs/monetization/FILES_CHANGED.md
- `A` docs/monetization/PHASE8_FRONTEND.md
- `A` docs/monetization/README.md

## Deployment / config (2)

- `M` docker-compose.prod.yml
- `M` docker-compose.yml
