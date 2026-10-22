import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { protect, AuthRequest } from '../middleware/auth';
import { ah, errorHandler } from '../utils/http';
import { IMAGE_RULES } from '../services/imageProcessing';
import * as c from '../controllers/premiumController';
import { myStanding, myAppeal } from '../controllers/moderationController';

// Creator premium posts. Every write re-checks the creator's plan with billing-service.
const router = express.Router();

const perUser = (windowMs: number, max: number, message: string) => rateLimit({
  windowMs, max, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => (req as AuthRequest).user?.id ?? req.ip ?? 'anon',
  message: { success: false, message },
});
const writeLimiter  = perUser(15 * 60 * 1000, 120, 'Too many changes. Please slow down.');
const submitLimiter = perUser(60 * 60 * 1000, 20,  'Too many submissions. Please try again later.');
const uploadLimiter = perUser(60 * 60 * 1000, 40,  'Too many uploads. Please try again later.');
const aiLimiter     = perUser(60 * 60 * 1000, 20,  'Too many image requests. Please try again later.');

// Memory storage: the bytes are checked and re-encoded before anything is stored
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: IMAGE_RULES.maxBytes, files: 1 } });

router.use(protect);

router.get('/meta',                 ah(c.meta));
router.get('/mine',                 ah(c.listMine));
router.get('/standing',             ah(myStanding));
router.post('/violations/:violationId/appeal', writeLimiter, ah(myAppeal));
router.post('/',                    writeLimiter, ah(c.create));
router.post('/upload',              uploadLimiter, upload.single('image'), ah(c.upload));
router.get('/:id',                  ah(c.getOne));
router.patch('/:id',                writeLimiter, ah(c.update));
router.delete('/:id',               writeLimiter, ah(c.remove));
router.get('/:id/preview',          ah(c.preview));
router.post('/:id/submit',          submitLimiter, ah(c.submit));
router.post('/:id/withdraw',        writeLimiter, ah(c.withdraw));
router.post('/:id/unpublish',       writeLimiter, ah(c.unpublish));
router.post('/:id/republish',       writeLimiter, ah(c.republish));
router.post('/:id/ai-image',                         aiLimiter, ah(c.aiGenerate));
router.post('/:id/ai-image/:candidateId/accept',     writeLimiter, ah(c.aiAccept));
router.post('/:id/ai-image/:candidateId/discard',    writeLimiter, ah(c.aiDiscard));

router.use(errorHandler);

export default router;
