import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Types } from 'mongoose';
import User from '../models/User';
import { EmailTemplate, isMailConfigured, sendTemplateEmail } from '../config/mailer';

// Service-to-service only (mounted at /internal, outside /api, so nginx never exposes it).
const router = express.Router();

router.use((req: Request, res: Response, next: NextFunction) => {
  const secret = process.env.INTERNAL_SERVICE_SECRET;
  if (!secret) { res.status(503).json({ success: false, message: 'Internal API is not configured.' }); return; }
  const given = Buffer.from(String(req.headers['x-internal-secret'] ?? ''));
  const want  = Buffer.from(secret);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }
  next();
});

const TEMPLATES: EmailTemplate[] = ['reviewer_assigned', 'post_approved', 'post_rejected', 'violation_updated'];

// POST /internal/email  { template, toUserId | toEmail, data }
router.post('/email', async (req: Request, res: Response) => {
  try {
    const { template, toUserId, toEmail, data } = (req.body ?? {}) as { template?: string; toUserId?: string; toEmail?: string; data?: Record<string, unknown> };
    if (!TEMPLATES.includes(template as EmailTemplate)) { res.status(400).json({ success: false, message: 'Unknown template.' }); return; }
    if (!isMailConfigured()) { res.status(503).json({ success: false, message: 'Email is not configured.', code: 'MAIL_NOT_CONFIGURED' }); return; }

    let to = typeof toEmail === 'string' && /^\S+@\S+\.\S+$/.test(toEmail) ? toEmail : null;
    if (!to && toUserId && Types.ObjectId.isValid(toUserId)) {
      const u = await User.findById(toUserId).select('email isActive').lean();
      if (u?.isActive !== false) to = u?.email ?? null;
    }
    if (!to) { res.status(404).json({ success: false, message: 'Recipient not found.', code: 'NO_RECIPIENT' }); return; }

    await sendTemplateEmail(to, template as EmailTemplate, data ?? {});
    res.json({ success: true });
  } catch (err) {
    console.error('[internal email] send failed:', (err as Error).message);
    res.status(502).json({ success: false, message: 'Email could not be sent.', code: 'MAIL_SEND_FAILED' });
  }
});

export default router;
