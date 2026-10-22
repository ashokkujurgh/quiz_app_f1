import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect, AuthRequest } from '../middleware/auth';
import { ah } from '../utils/http';
import * as creator from '../controllers/creatorController';
import * as earnings from '../controllers/earningsController';
import * as wd from '../controllers/withdrawalController';

const router = express.Router();

const applyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 20,
  keyGenerator: (req) => (req as AuthRequest).user?.id ?? req.ip ?? 'anon',
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});

router.get('/guidelines', ah(creator.getGuidelines));
router.get('/me',         protect, ah(creator.getMe));
router.post('/apply',     protect, applyLimiter, ah(creator.apply));

// Earnings (computed on the server from the ledger; nothing here can be changed by the creator)
router.get('/balance',              protect, ah(earnings.balance));
router.get('/earnings/summary',     protect, ah(earnings.summary));
router.get('/earnings/analytics',   protect, ah(earnings.analytics));
router.get('/earnings/ledger',      protect, ah(earnings.ledger));

// Payout methods and withdrawals (details are encrypted at rest and only shown masked)
const moneyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 30,
  keyGenerator: (req) => (req as AuthRequest).user?.id ?? req.ip ?? 'anon',
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});
router.get('/payout-methods',         protect, ah(wd.listMethods));
router.post('/payout-methods',        protect, moneyLimiter, ah(wd.addMethod));
router.delete('/payout-methods/:id',  protect, moneyLimiter, ah(wd.removeMethod));
router.get('/withdrawals/eligibility', protect, ah(wd.eligibility));
router.get('/withdrawals',            protect, ah(wd.list));
router.post('/withdrawals',           protect, moneyLimiter, ah(wd.request));
router.get('/withdrawals/:id',        protect, ah(wd.getOne));
router.post('/withdrawals/:id/cancel', protect, moneyLimiter, ah(wd.cancel));

export default router;
