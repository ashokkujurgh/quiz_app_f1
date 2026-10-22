import { fake, store, payOrder, checkoutSignature, webhookSignature } from './fakeRazorpay';
jest.mock('../src/services/razorpay', () => {
  const actual = jest.requireActual('../src/services/razorpay');
  const f = jest.requireActual('./fakeRazorpay').fake;
  return { ...actual, createOrder: f.createOrder, fetchPayment: f.fetchPayment, fetchOrderPayments: f.fetchOrderPayments, capturePayment: f.capturePayment };
});

import request from 'supertest';
import { Types } from 'mongoose';
import app from '../src/app';
import Payment from '../src/models/Payment';
import UserSubscription from '../src/models/UserSubscription';
import WebhookEvent from '../src/models/WebhookEvent';
import { getEntitlements } from '../src/services/entitlements';
import { markExpired } from '../src/services/subscriptions';
import { reconcileOpenPayments } from '../src/services/payments';
import { startDb, stopDb, resetDb, makeUser, tokenFor } from './setup';

const DAY = 86_400_000;

beforeAll(() => startDb(true));
afterAll(() => stopDb());
beforeEach(async () => { await resetDb(); store.reset(); jest.clearAllMocks(); });

async function checkout(token: string, planCode = 'premium', idempotencyKey?: string) {
  return request(app).post('/api/billing/checkout').set('Authorization', `Bearer ${token}`).send({ planCode, idempotencyKey });
}

async function verify(token: string, orderId: string, paymentId: string, signature = checkoutSignature(orderId, paymentId)) {
  return request(app).post('/api/billing/verify').set('Authorization', `Bearer ${token}`)
    .send({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature });
}

function webhook(event: string, payload: object, eventId = `evt_${Math.random().toString(36).slice(2)}`, sig?: string) {
  const body = JSON.stringify({ event, payload });
  return request(app).post('/api/billing/webhook/razorpay')
    .set('Content-Type', 'application/json')
    .set('X-Razorpay-Signature', sig ?? webhookSignature(body))
    .set('X-Razorpay-Event-Id', eventId)
    .send(body);
}

async function buyPremium(token: string, plan = 'premium') {
  const c = await checkout(token, plan);
  const rp = payOrder(c.body.checkout.orderId);
  const v = await verify(token, c.body.checkout.orderId, rp.id);
  return { c, rp, v };
}

describe('plans and entitlements', () => {
  it('lists the three plans with integer paise prices and one-time billing', async () => {
    const res = await request(app).get('/api/billing/plans');
    expect(res.status).toBe(200);
    expect(res.body.plans.map((p: { code: string; pricePaise: number }) => [p.code, p.pricePaise]))
      .toEqual([['free', 0], ['premium', 4900], ['creator', 9900]]);
    expect(res.body.plans[1].billingType).toBe('one_time');
  });

  it('gives a new user Free limits: 1 quiz play and 1 quiz creation a day, no creator tools', async () => {
    const u = await makeUser();
    const e = await getEntitlements(u.id);
    expect(e.plan.code).toBe('free');
    expect(e.dailyLimits).toEqual({ quiz_play: 1, quiz_create: 1 });
    expect(e.features.creatorTools).toBe(false);
  });

  it('gives admins unlimited quotas', async () => {
    const a = await makeUser('admin');
    expect((await getEntitlements(a.id)).dailyLimits).toEqual({ quiz_play: null, quiz_create: null });
  });
});

describe('checkout', () => {
  it('is disabled with a clear message when Razorpay keys are missing', async () => {
    const u = await makeUser();
    const saved = process.env.RAZORPAY_KEY_SECRET;
    delete process.env.RAZORPAY_KEY_SECRET;
    const res = await checkout(u.token);
    process.env.RAZORPAY_KEY_SECRET = saved;
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('PAYMENTS_NOT_CONFIGURED');
  });

  it('takes the price from the server, not the request', async () => {
    const u = await makeUser();
    const res = await request(app).post('/api/billing/checkout').set('Authorization', `Bearer ${u.token}`)
      .send({ planCode: 'creator', amountPaise: 1, pricePaise: 1 });
    expect(res.status).toBe(201);
    expect(res.body.checkout.amountPaise).toBe(9900);
    expect(fake.createOrder).toHaveBeenCalledWith(9900, expect.any(String), expect.any(Object));
  });

  it('returns the same order for a repeated idempotency key', async () => {
    const u = await makeUser();
    const a = await checkout(u.token, 'premium', 'key-abcdef12');
    const b = await checkout(u.token, 'premium', 'key-abcdef12');
    expect(b.body.checkout.orderId).toBe(a.body.checkout.orderId);
    expect(await Payment.countDocuments()).toBe(1);
  });

  it('rejects unknown plans and the free plan', async () => {
    const u = await makeUser();
    expect((await checkout(u.token, 'free')).status).toBe(400);
    expect((await checkout(u.token, 'gold')).status).toBe(400);
  });

  it('marks the payment failed when Razorpay cannot create the order', async () => {
    const u = await makeUser();
    store.failNextOrder = true;
    const res = await checkout(u.token);
    expect(res.status).toBe(502);
    expect((await Payment.findOne())!.status).toBe('failed');
  });
});

describe('verify (browser callback)', () => {
  it('activates Premium for 30 days only after server-side checks', async () => {
    const u = await makeUser();
    const { v } = await buyPremium(u.token);
    expect(v.status).toBe(200);
    expect(v.body.payment.status).toBe('paid');
    const e = await getEntitlements(u.id);
    expect(e.plan.code).toBe('premium');
    expect(e.dailyLimits).toEqual({ quiz_play: null, quiz_create: null });
    const days = (new Date(e.subscription!.endsAt).getTime() - new Date(e.subscription!.startsAt).getTime()) / DAY;
    expect(days).toBeCloseTo(30, 3);
  });

  it('rejects a forged signature and does not activate', async () => {
    const u = await makeUser();
    const c = await checkout(u.token);
    const rp = payOrder(c.body.checkout.orderId);
    const res = await verify(u.token, c.body.checkout.orderId, rp.id, 'f'.repeat(64));
    expect(res.status).toBe(400);
    expect((await getEntitlements(u.id)).plan.code).toBe('free');
  });

  it('does not activate when Razorpay says the payment was not captured', async () => {
    const u = await makeUser();
    const c = await checkout(u.token);
    const rp = payOrder(c.body.checkout.orderId, 'failed');
    const res = await verify(u.token, c.body.checkout.orderId, rp.id);
    expect(res.status).toBe(202);
    expect(res.body.payment.status).toBe('failed');
    expect((await getEntitlements(u.id)).plan.code).toBe('free');
  });

  it('does not activate when the paid amount differs from the order', async () => {
    const u = await makeUser();
    const c = await checkout(u.token);
    const rp = payOrder(c.body.checkout.orderId, 'captured', 100);
    const res = await verify(u.token, c.body.checkout.orderId, rp.id);
    expect(res.status).toBe(409);
    expect((await getEntitlements(u.id)).plan.code).toBe('free');
  });

  it("refuses to verify another user's order", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const c = await checkout(a.token);
    const rp = payOrder(c.body.checkout.orderId);
    expect((await verify(b.token, c.body.checkout.orderId, rp.id)).status).toBe(404);
  });

  it('captures an authorized payment itself', async () => {
    const u = await makeUser();
    const c = await checkout(u.token);
    const rp = payOrder(c.body.checkout.orderId, 'authorized');
    const res = await verify(u.token, c.body.checkout.orderId, rp.id);
    expect(fake.capturePayment).toHaveBeenCalled();
    expect(res.body.payment.status).toBe('paid');
  });
});

describe('webhooks', () => {
  it('rejects a bad signature', async () => {
    const res = await webhook('payment.captured', {}, 'evt_1', 'bad');
    expect(res.status).toBe(400);
  });

  it('activates from payment.captured even if the browser never called verify', async () => {
    const u = await makeUser();
    const c = await checkout(u.token);
    const rp = payOrder(c.body.checkout.orderId);
    const res = await webhook('payment.captured', { payment: { entity: rp } });
    expect(res.body.outcome).toBe('processed');
    expect((await getEntitlements(u.id)).plan.code).toBe('premium');
  });

  it('ignores a duplicate delivery of the same event', async () => {
    const u = await makeUser();
    const c = await checkout(u.token);
    const rp = payOrder(c.body.checkout.orderId);
    await webhook('payment.captured', { payment: { entity: rp } }, 'evt_dup');
    const again = await webhook('payment.captured', { payment: { entity: rp } }, 'evt_dup');
    expect(again.body.outcome).toBe('duplicate');
    expect(await UserSubscription.countDocuments({ userId: new Types.ObjectId(u.id) })).toBe(1);
    expect(await WebhookEvent.countDocuments()).toBe(1);
  });

  it('creates exactly one period when verify, two webhooks and reconcile all race', async () => {
    const u = await makeUser();
    const c = await checkout(u.token);
    const rp = payOrder(c.body.checkout.orderId);
    await Promise.all([
      verify(u.token, c.body.checkout.orderId, rp.id),
      webhook('payment.captured', { payment: { entity: rp } }, 'evt_a'),
      webhook('order.paid', { payment: { entity: rp }, order: { entity: { id: rp.order_id } } }, 'evt_b'),
      reconcileOpenPayments(0),
    ]);
    expect(await UserSubscription.countDocuments({ userId: new Types.ObjectId(u.id) })).toBe(1);
    expect((await Payment.findOne())!.status).toBe('paid');
  });

  it('marks a failed payment, and a later successful retry on the same order still activates', async () => {
    const u = await makeUser();
    const c = await checkout(u.token);
    const bad = payOrder(c.body.checkout.orderId, 'failed');
    await webhook('payment.failed', { payment: { entity: { ...bad, error_description: 'Bank declined' } } });
    const p1 = await Payment.findOne();
    expect(p1!.status).toBe('failed');
    expect(p1!.failureReason).toBe('Bank declined');

    const good = payOrder(c.body.checkout.orderId);
    await webhook('payment.captured', { payment: { entity: good } });
    expect((await Payment.findOne())!.status).toBe('paid');
  });

  it('a full refund ends access and the user falls back to Free', async () => {
    const u = await makeUser();
    const { rp } = await buyPremium(u.token);
    const res = await webhook('refund.processed', {
      refund: { entity: { id: 'rfnd_1', payment_id: rp.id, amount: 4900 } },
      payment: { entity: { ...rp, status: 'refunded', amount_refunded: 4900 } },
    });
    expect(res.body.outcome).toBe('processed');
    expect((await Payment.findOne())!.status).toBe('refunded');
    expect((await UserSubscription.findOne())!.status).toBe('refunded');
    expect((await getEntitlements(u.id)).plan.code).toBe('free');
  });

  it('a partial refund is recorded but keeps access', async () => {
    const u = await makeUser();
    const { rp } = await buyPremium(u.token);
    await webhook('refund.processed', {
      refund: { entity: { id: 'rfnd_2', payment_id: rp.id, amount: 1000 } },
      payment: { entity: { ...rp, amount_refunded: 1000 } },
    });
    const p = await Payment.findOne();
    expect(p!.status).toBe('partially_refunded');
    expect(p!.refundedPaise).toBe(1000);
    expect((await getEntitlements(u.id)).plan.code).toBe('premium');
  });

  it('ignores events for orders that are not ours', async () => {
    const res = await webhook('payment.captured', { payment: { entity: { id: 'pay_x', order_id: 'order_other', amount: 100, currency: 'INR', status: 'captured' } } });
    expect(res.body.outcome).toBe('ignored');
  });
});

describe('renewal, upgrade, expiry', () => {
  it('a renewal bought early starts when the current period ends', async () => {
    const u = await makeUser();
    await buyPremium(u.token);
    await buyPremium(u.token);
    const subs = await UserSubscription.find({ userId: new Types.ObjectId(u.id) }).sort({ startsAt: 1 });
    expect(subs).toHaveLength(2);
    expect(subs[1].startsAt.getTime()).toBe(subs[0].endsAt.getTime());
    const e = await getEntitlements(u.id);
    expect(e.upcoming).toHaveLength(1);
  });

  it('upgrading converts unused Premium time into Creator time by value', async () => {
    const u = await makeUser();
    await buyPremium(u.token);
    // Pretend 15 of the 30 days are used
    await UserSubscription.updateOne({}, { $set: { startsAt: new Date(Date.now() - 15 * DAY), endsAt: new Date(Date.now() + 15 * DAY) } });
    await buyPremium(u.token, 'creator');

    const premium = await UserSubscription.findOne({ planCode: 'premium' });
    const creator = await UserSubscription.findOne({ planCode: 'creator' });
    expect(premium!.status).toBe('converted');
    expect(creator!.bonusDays).toBeCloseTo(15 * 4900 / 9900, 1); // ≈ 7.42 days
    const e = await getEntitlements(u.id);
    expect(e.plan.code).toBe('creator');
    expect(e.features.creatorTools).toBe(true);
  });

  it('an expired plan loses its entitlements immediately and keeps its history', async () => {
    const u = await makeUser();
    await buyPremium(u.token);
    await UserSubscription.updateOne({}, { $set: { startsAt: new Date(Date.now() - 31 * DAY), endsAt: new Date(Date.now() - DAY) } });

    const e = await getEntitlements(u.id);
    expect(e.plan.code).toBe('free');
    expect(e.dailyLimits).toEqual({ quiz_play: 1, quiz_create: 1 });

    expect(await markExpired()).toBe(1);
    const res = await request(app).get('/api/billing/subscription').set('Authorization', `Bearer ${u.token}`);
    expect(res.body.status).toBe('expired');
    expect(res.body.history).toHaveLength(1);
  });

  it('blocks buying more than ~13 months ahead', async () => {
    const u = await makeUser();
    await UserSubscription.create({ userId: new Types.ObjectId(u.id), planCode: 'premium', tier: 1, startsAt: new Date(), endsAt: new Date(Date.now() + 390 * DAY), source: 'admin_grant' });
    const res = await checkout(u.token);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PREPAID_LIMIT');
  });
});

describe('interrupted checkout and reconciliation', () => {
  it('activates a payment whose browser tab closed after paying', async () => {
    const u = await makeUser();
    const c = await checkout(u.token);
    await request(app).post(`/api/billing/payments/${c.body.checkout.paymentId}/cancel`).set('Authorization', `Bearer ${u.token}`);
    expect((await Payment.findOne())!.status).toBe('cancelled');
    payOrder(c.body.checkout.orderId); // money was actually taken
    await reconcileOpenPayments(0);
    expect((await Payment.findOne())!.status).toBe('paid');
    expect((await getEntitlements(u.id)).plan.code).toBe('premium');
  });

  it('expires orders that were never paid after 24 hours', async () => {
    const u = await makeUser();
    await checkout(u.token);
    await Payment.collection.updateOne({}, { $set: { createdAt: new Date(Date.now() - 25 * 3600_000) } });
    await reconcileOpenPayments(0);
    expect((await Payment.findOne())!.status).toBe('expired');
  });
});

describe('access control', () => {
  it('requires login for subscription endpoints', async () => {
    expect((await request(app).get('/api/billing/subscription')).status).toBe(401);
  });

  it('checks the admin role in the database, not the token', async () => {
    const u = await makeUser('user');
    const forged = tokenFor(u.id, 'admin');
    expect((await request(app).get('/api/billing/admin/payments').set('Authorization', `Bearer ${forged}`)).status).toBe(403);
    const a = await makeUser('admin');
    expect((await request(app).get('/api/billing/admin/payments').set('Authorization', `Bearer ${a.token}`)).status).toBe(200);
  });

  it('admin grant is logged and gives the plan', async () => {
    const a = await makeUser('admin');
    const u = await makeUser();
    const res = await request(app).post('/api/billing/admin/subscriptions/grant').set('Authorization', `Bearer ${a.token}`)
      .send({ userId: u.id, planCode: 'creator', days: 7, reason: 'Beta tester' });
    expect(res.status).toBe(201);
    expect((await getEntitlements(u.id)).plan.code).toBe('creator');
  });

  it('internal API needs the shared secret', async () => {
    const u = await makeUser();
    expect((await request(app).get(`/internal/entitlements/${u.id}`)).status).toBe(403);
    const ok = await request(app).get(`/internal/entitlements/${u.id}`).set('x-internal-secret', 'test-internal-secret');
    expect(ok.body.entitlements.plan.code).toBe('free');
  });

  it('never returns signatures or secrets in payment history', async () => {
    const u = await makeUser();
    await buyPremium(u.token);
    const res = await request(app).get('/api/billing/payments').set('Authorization', `Bearer ${u.token}`);
    const text = JSON.stringify(res.body);
    expect(text).not.toContain('rzp_test_secret');
    expect(text).not.toContain('signature');
    expect(res.body.payments[0].billingType).toBe('one_time');
  });
});
