import crypto from 'crypto';
import { Types } from 'mongoose';
import Payment, { IPayment } from '../models/Payment';
import User from '../models/User';
import WebhookEvent from '../models/WebhookEvent';
import * as rzp from './razorpay';
import { getPlan } from './plans';
import { activatePayment, applyRefund, assertWithinPrepaidLimit } from './subscriptions';
import { AppError } from '../utils/errors';

const OPEN_STATUSES = ['created', 'pending', 'cancelled', 'failed'] as const;
const ORDER_EXPIRY_MS = 24 * 60 * 60 * 1000;

export const NOT_CONFIGURED_MESSAGE = 'Online payments are not set up yet. Please try again later.';

function assertConfigured(): void {
  if (!rzp.isConfigured()) throw new AppError(503, NOT_CONFIGURED_MESSAGE, 'PAYMENTS_NOT_CONFIGURED');
}

/** Client-visible payment shape. Never includes signatures or provider internals. */
export function publicPayment(p: IPayment) {
  return {
    id:             p._id.toString(),
    planCode:       p.planCode,
    amountPaise:    p.amountPaise,
    currency:       p.currency,
    status:         p.status,
    billingType:    'one_time' as const,
    method:         p.method,
    orderId:        p.razorpayOrderId,
    paymentRef:     p.razorpayPaymentId,
    refundedPaise:  p.refundedPaise,
    failureReason:  p.failureReason,
    subscriptionId: p.subscriptionId?.toString() ?? null,
    paidAt:         p.paidAt,
    createdAt:      p.createdAt,
  };
}

// ── Checkout ──────────────────────────────────────────────────────────────────

export async function startCheckout(userId: string, planCode: string, idempotencyKey?: string) {
  assertConfigured();
  if (planCode !== 'premium' && planCode !== 'creator') throw new AppError(400, 'Choose the Premium or Creator Premium plan.');
  const plan = await getPlan(planCode);
  if (!plan || !plan.isActive || plan.pricePaise <= 0) throw new AppError(400, 'This plan is not available right now.');

  const uid = new Types.ObjectId(userId);
  const key = (idempotencyKey && /^[A-Za-z0-9_-]{8,64}$/.test(idempotencyKey)) ? idempotencyKey : crypto.randomUUID();

  // Same key again (double click, retry after network error) → same order
  const existing = await Payment.findOne({ userId: uid, idempotencyKey: key });
  if (existing) {
    if (existing.planCode !== planCode) throw new AppError(409, 'This checkout was started for a different plan.');
    if (existing.status === 'created' && existing.razorpayOrderId) return checkoutPayload(existing, plan.name, userId);
    throw new AppError(409, 'This checkout has already finished. Start a new one.', 'CHECKOUT_FINISHED');
  }

  await assertWithinPrepaidLimit(uid, planCode);

  let payment;
  try {
    payment = await Payment.create({
      userId: uid, planCode, amountPaise: plan.pricePaise, currency: 'INR', status: 'created', idempotencyKey: key,
      events: [{ type: 'checkout_started', source: 'checkout' }],
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return startCheckout(userId, planCode, key); // raced with itself
    throw err;
  }

  try {
    const order = await rzp.createOrder(plan.pricePaise, payment._id.toString(), {
      paymentId: payment._id.toString(), userId, planCode,
    });
    payment.razorpayOrderId = order.id;
    await payment.save();
  } catch (err) {
    console.error('[billing] Razorpay order creation failed:', (err as Error).message);
    payment.status = 'failed';
    payment.failureReason = 'Could not start the payment.';
    payment.events.push({ at: new Date(), type: 'order_failed', source: 'checkout' });
    await payment.save();
    throw new AppError(502, "We couldn't start the payment. Please try again.");
  }

  return checkoutPayload(payment, plan.name, userId);
}

async function checkoutPayload(p: IPayment, planName: string, userId: string) {
  const user = await User.findById(userId).select('name email').lean();
  return {
    paymentId:   p._id.toString(),
    keyId:       rzp.publicKeyId(),
    orderId:     p.razorpayOrderId,
    amountPaise: p.amountPaise,
    currency:    p.currency,
    planCode:    p.planCode,
    planName,
    billingType: 'one_time' as const,
    notice:      'One-time payment for 30 days. It does not renew automatically.',
    prefill:     { name: user?.name ?? '', email: user?.email ?? '' },
  };
}

export async function cancelCheckout(userId: string, paymentId: string) {
  if (!Types.ObjectId.isValid(paymentId)) throw new AppError(400, 'Invalid payment id.');
  const p = await Payment.findOneAndUpdate(
    { _id: paymentId, userId: new Types.ObjectId(userId), status: 'created' },
    { $set: { status: 'cancelled' }, $push: { events: { at: new Date(), type: 'checkout_cancelled', source: 'client' } } },
    { new: true }
  );
  if (!p) {
    const any = await Payment.findOne({ _id: paymentId, userId: new Types.ObjectId(userId) });
    if (!any) throw new AppError(404, 'Payment not found.');
    return any.toObject();
  }
  return p.toObject();
}

// ── Applying what Razorpay tells us ───────────────────────────────────────────

/** Act on an authoritative Razorpay payment record (from the API or a signed webhook). */
async function applyProviderPayment(payment: IPayment, rp: rzp.RazorpayPayment, source: 'verify' | 'webhook' | 'reconcile'): Promise<IPayment> {
  if (rp.order_id !== payment.razorpayOrderId || rp.amount !== payment.amountPaise || rp.currency !== 'INR') {
    console.error(`[billing] Payment ${payment._id} does not match Razorpay record ${rp.id} (order/amount/currency) — not activating`);
    await Payment.updateOne({ _id: payment._id }, { $push: { events: { at: new Date(), type: 'mismatch', source, note: rp.id } } });
    throw new AppError(409, 'Payment details did not match. Please contact support.');
  }

  if (rp.status === 'authorized') {
    // Auto-capture is normally on; capture ourselves if it isn't
    try {
      rp = await rzp.capturePayment(rp.id, payment.amountPaise);
    } catch (err) {
      console.warn(`[billing] capture failed for ${rp.id}:`, (err as Error).message);
      await Payment.updateOne({ _id: payment._id, status: { $in: ['created', 'cancelled', 'failed'] } },
        { $set: { status: 'pending', razorpayPaymentId: rp.id }, $push: { events: { at: new Date(), type: 'authorized', source } } });
      return (await Payment.findById(payment._id).lean<IPayment>())!;
    }
  }

  if (rp.status === 'captured' || rp.status === 'refunded') {
    const activated = await activatePayment(payment._id, rp.id, rp.method ?? null, source);
    const refunded = rp.amount_refunded ?? 0;
    if (refunded > 0) await applyRefund(activated, refunded, source === 'verify' ? 'reconcile' : source);
    return (await Payment.findById(payment._id).lean<IPayment>())!;
  }

  if (rp.status === 'failed') {
    await Payment.updateOne(
      { _id: payment._id, status: { $in: [...OPEN_STATUSES] } },
      { $set: { status: 'failed', failureReason: rp.error_description ?? 'Payment failed.' },
        $push: { events: { at: new Date(), type: 'failed', source, note: rp.id } } }
    );
  }
  return (await Payment.findById(payment._id).lean<IPayment>())!;
}

// ── Verify (browser checkout handler) ─────────────────────────────────────────

export async function verifyCheckout(userId: string, body: { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string }) {
  assertConfigured();
  const { razorpay_order_id: orderId, razorpay_payment_id: rpPaymentId, razorpay_signature: signature } = body;
  if (!orderId || !rpPaymentId || !signature) throw new AppError(400, 'Missing payment details.');

  const payment = await Payment.findOne({ razorpayOrderId: orderId, userId: new Types.ObjectId(userId) }).lean<IPayment>();
  if (!payment) throw new AppError(404, 'Payment not found.');
  if (!rzp.verifyCheckoutSignature(orderId, rpPaymentId, signature)) throw new AppError(400, 'Payment signature is invalid.');

  // The signature proves the browser didn't invent ids; we still ask Razorpay for the real status.
  let rp: rzp.RazorpayPayment;
  try {
    rp = await rzp.fetchPayment(rpPaymentId);
  } catch (err) {
    console.warn('[billing] fetchPayment failed during verify:', (err as Error).message);
    await Payment.updateOne({ _id: payment._id, status: { $in: ['created', 'cancelled'] } },
      { $set: { status: 'pending', razorpayPaymentId: rpPaymentId }, $push: { events: { at: new Date(), type: 'verify_deferred', source: 'verify' } } });
    return (await Payment.findById(payment._id).lean<IPayment>())!;
  }
  return applyProviderPayment(payment, rp, 'verify');
}

// ── Webhook ───────────────────────────────────────────────────────────────────

interface WebhookBody {
  event: string;
  payload?: {
    payment?: { entity?: rzp.RazorpayPayment };
    order?:   { entity?: { id: string } };
    refund?:  { entity?: { id: string; payment_id: string; amount: number } };
  };
}

export type WebhookOutcome = 'processed' | 'duplicate' | 'ignored' | 'retry_later';

export async function handleWebhook(rawBody: Buffer, signature: string | undefined, eventIdHeader: string | undefined): Promise<WebhookOutcome> {
  if (!rzp.isWebhookConfigured()) throw new AppError(503, 'Webhooks are not configured.');
  if (!rzp.verifyWebhookSignature(rawBody, signature)) throw new AppError(400, 'Invalid signature.');

  let body: WebhookBody;
  try { body = JSON.parse(rawBody.toString('utf8')); } catch { throw new AppError(400, 'Invalid JSON.'); }
  if (!body?.event) throw new AppError(400, 'Invalid event.');

  const eventId = eventIdHeader || crypto.createHash('sha256').update(rawBody).digest('hex');
  const ids = {
    orderId:   body.payload?.payment?.entity?.order_id ?? body.payload?.order?.entity?.id ?? null,
    paymentId: body.payload?.payment?.entity?.id ?? body.payload?.refund?.entity?.payment_id ?? null,
    refundId:  body.payload?.refund?.entity?.id ?? null,
  };

  // Claim the event. A re-delivery of a finished event is a no-op.
  try {
    await WebhookEvent.create({ eventId, event: body.event, status: 'processing', ...ids });
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err;
    const staleBefore = new Date(Date.now() - 5 * 60 * 1000);
    const reclaimed = await WebhookEvent.findOneAndUpdate(
      { eventId, $or: [{ status: 'failed' }, { status: 'processing', updatedAt: { $lt: staleBefore } }] },
      { $set: { status: 'processing', error: null }, $inc: { attempts: 1 } },
      { new: true }
    );
    if (!reclaimed) {
      const ev = await WebhookEvent.findOne({ eventId }).lean();
      return ev?.status === 'processing' ? 'retry_later' : 'duplicate';
    }
  }

  try {
    const outcome = await processWebhookEvent(body);
    await WebhookEvent.updateOne({ eventId }, { $set: { status: outcome, processedAt: new Date() } });
    return outcome;
  } catch (err) {
    await WebhookEvent.updateOne({ eventId }, { $set: { status: 'failed', error: (err as Error).message.slice(0, 300) } });
    throw err;
  }
}

async function processWebhookEvent(body: WebhookBody): Promise<'processed' | 'ignored'> {
  const rp = body.payload?.payment?.entity;

  switch (body.event) {
    case 'payment.captured':
    case 'payment.authorized':
    case 'payment.failed':
    case 'order.paid': {
      if (!rp?.order_id) return 'ignored';
      const payment = await Payment.findOne({ razorpayOrderId: rp.order_id }).lean<IPayment>();
      if (!payment) return 'ignored'; // not a Meenzo subscription order
      await applyProviderPayment(payment, rp, 'webhook');
      return 'processed';
    }
    case 'refund.processed':
    case 'refund.created': {
      const refund = body.payload?.refund?.entity;
      const rpPaymentId = refund?.payment_id ?? rp?.id;
      if (!rpPaymentId) return 'ignored';
      const payment = await Payment.findOne({ razorpayPaymentId: rpPaymentId }).lean<IPayment>();
      if (!payment) return 'ignored';
      if (body.event === 'refund.created') return 'ignored'; // act only once the refund is processed
      const refunded = rp?.amount_refunded ?? Math.min(payment.amountPaise, payment.refundedPaise + (refund?.amount ?? 0));
      await applyRefund(payment, refunded, 'webhook');
      return 'processed';
    }
    default:
      return 'ignored';
  }
}

// ── Reconciliation (interrupted checkouts, missed webhooks) ───────────────────

export async function reconcilePayment(payment: IPayment): Promise<IPayment> {
  if (!rzp.isConfigured() || !payment.razorpayOrderId) return payment;

  const items = await rzp.fetchOrderPayments(payment.razorpayOrderId);
  const best =
    items.find((i) => i.status === 'captured' || i.status === 'refunded') ??
    items.find((i) => i.status === 'authorized') ??
    null;

  if (best) return applyProviderPayment(payment, best, 'reconcile');

  const age = Date.now() - new Date(payment.createdAt).getTime();
  if (age > ORDER_EXPIRY_MS && ['created', 'cancelled'].includes(payment.status)) {
    await Payment.updateOne({ _id: payment._id, status: payment.status },
      { $set: { status: 'expired' }, $push: { events: { at: new Date(), type: 'expired', source: 'reconcile' } } });
  } else if (items.length && items.every((i) => i.status === 'failed') && payment.status !== 'failed') {
    return applyProviderPayment(payment, items[items.length - 1], 'reconcile');
  }
  return (await Payment.findById(payment._id).lean<IPayment>())!;
}

/** Re-check open payments older than `minAgeMs` and paid ones missing a subscription. */
export async function reconcileOpenPayments(minAgeMs = 10 * 60 * 1000): Promise<number> {
  if (!rzp.isConfigured()) return 0;
  const now = Date.now();
  const candidates = await Payment.find({
    $or: [
      { status: { $in: ['created', 'pending', 'cancelled'] }, createdAt: { $lt: new Date(now - minAgeMs), $gt: new Date(now - 3 * ORDER_EXPIRY_MS) } },
      { status: 'paid', subscriptionId: null },
    ],
    razorpayOrderId: { $type: 'string' },
  }).limit(100).lean<IPayment[]>();

  let n = 0;
  for (const p of candidates) {
    try { await reconcilePayment(p); n++; }
    catch (err) { console.error(`[billing] reconcile ${p._id} failed:`, (err as Error).message); }
  }
  return n;
}
