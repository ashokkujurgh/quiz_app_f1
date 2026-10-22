import { Request, Response } from 'express';
import { handleWebhook } from '../services/payments';
import { AppError } from '../utils/errors';

// POST /api/billing/webhook/razorpay  (raw body; signature-checked)
export async function razorpayWebhook(req: Request, res: Response) {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
  try {
    const outcome = await handleWebhook(raw, req.header('x-razorpay-signature'), req.header('x-razorpay-event-id'));
    if (outcome === 'retry_later') { res.status(503).json({ success: false, message: 'Event in progress.' }); return; }
    res.json({ success: true, outcome });
  } catch (err) {
    if (err instanceof AppError && err.status < 500) {
      res.status(err.status).json({ success: false, message: err.message });
      return;
    }
    // Non-2xx makes Razorpay retry later
    console.error('[billing] webhook processing failed:', (err as Error).message);
    res.status(500).json({ success: false, message: 'Webhook processing failed.' });
  }
}
