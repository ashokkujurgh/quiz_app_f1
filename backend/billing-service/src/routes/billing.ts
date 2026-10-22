import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect, requireRole, AuthRequest } from '../middleware/auth';
import { ah } from '../utils/http';
import * as billing from '../controllers/billingController';
import * as admin from '../controllers/adminController';
import * as quota from '../controllers/quotaController';
import { adminListCreators, adminSetCreatorStatus } from '../controllers/creatorController';
import * as earnings from '../controllers/earningsController';
import * as wd from '../controllers/withdrawalController';

const router = express.Router();

// Per-user limit on starting payments (falls back to IP before auth)
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => (req as AuthRequest).user?.id ?? req.ip ?? 'anon',
  message: { success: false, message: 'Too many payment attempts. Please wait a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/plans', ah(billing.listPlans));

router.get('/subscription',             protect, ah(billing.getMySubscription));
router.post('/subscription/cancel',     protect, ah(billing.cancelSubscription));
router.get('/entitlements',             protect, ah(billing.myEntitlements));
router.get('/quota',                    protect, ah(quota.myQuota));
router.get('/quota/eligibility',        protect, ah(quota.myEligibility));
router.post('/checkout',                protect, paymentLimiter, ah(billing.checkout));
router.post('/verify',                  protect, paymentLimiter, ah(billing.verify));
router.get('/payments',                 protect, ah(billing.listPayments));
router.get('/payments/:id',             protect, ah(billing.getPayment));
router.post('/payments/:id/cancel',     protect, ah(billing.cancelCheckout));

// ── Admin ─────────────────────────────────────────────────────────────────────
const adminOnly = [protect, requireRole('admin')];
router.get('/admin/payments',                   ...adminOnly, ah(admin.adminListPayments));
router.post('/admin/payments/:id/reconcile',    ...adminOnly, ah(admin.adminReconcile));
router.get('/admin/subscriptions',              ...adminOnly, ah(admin.adminListSubscriptions));
router.post('/admin/subscriptions/grant',       ...adminOnly, ah(admin.adminGrant));
router.post('/admin/subscriptions/:id/revoke',  ...adminOnly, ah(admin.adminRevoke));
router.get('/admin/users/:userId/entitlements', ...adminOnly, ah(admin.adminUserEntitlements));
router.get('/admin/creators',                   ...adminOnly, ah(adminListCreators));
router.post('/admin/creators/:userId/status',   ...adminOnly, ah(adminSetCreatorStatus));
router.get('/admin/creators/:userId/balance',   ...adminOnly, ah(earnings.adminCreatorBalance));
router.post('/admin/earnings/reverse',          ...adminOnly, ah(earnings.adminReverse));
router.post('/admin/earnings/adjust',           ...adminOnly, ah(earnings.adminAdjust));
router.post('/admin/earnings/reconcile',        ...adminOnly, ah(earnings.adminReconcile));
// Payouts (manual workflow; only admins)
router.get('/admin/withdrawals',                     ...adminOnly, ah(wd.adminList));
router.get('/admin/withdrawals/export.csv',          ...adminOnly, ah(wd.adminExport));
router.post('/admin/withdrawals/reconcile',          ...adminOnly, ah(wd.adminReconcile));
router.get('/admin/withdrawals/:id',                 ...adminOnly, ah(wd.adminDetail));
router.get('/admin/withdrawals/:id/payout-details',  ...adminOnly, ah(wd.adminReveal));
router.post('/admin/withdrawals/:id/:action',        ...adminOnly, ah(wd.adminAct));

export default router;
