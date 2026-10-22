import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect, AuthRequest } from '../middleware/auth';
import { ah, errorHandler } from '../utils/http';
import * as c from '../controllers/moderationController';

// Premium-post moderation. Every handler re-checks the reviewer/admin role in the database.
const router = express.Router();

const decisionLimiter = rateLimit({
  windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => (req as AuthRequest).user?.id ?? req.ip ?? 'anon',
  message: { success: false, message: 'Too many actions. Please slow down.' },
});

router.use(protect);

router.get('/queue',                            ah(c.queue));
router.get('/history',                          ah(c.history));
router.get('/appeals',                          ah(c.appeals));
router.post('/violations/:id/overturn',         decisionLimiter, ah(c.overturn));
router.post('/violations/:id/appeal-decision',  decisionLimiter, ah(c.appealDecision));
router.get('/:revisionId',                      ah(c.detail));
router.post('/:revisionId/approve',             decisionLimiter, ah(c.approve));
router.post('/:revisionId/reject',              decisionLimiter, ah(c.reject));
router.post('/:revisionId/notes',               decisionLimiter, ah(c.note));
router.post('/:revisionId/assign',              decisionLimiter, ah(c.assign));
router.post('/:revisionId/rescreen',            decisionLimiter, ah(c.rescreen));

router.use(errorHandler);

export default router;
