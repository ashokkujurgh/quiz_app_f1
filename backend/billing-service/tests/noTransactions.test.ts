// Same guarantees on a standalone MongoDB (no transactions): duplicate activations still create one period.
import { store, payOrder, webhookSignature, checkoutSignature } from './fakeRazorpay';
jest.mock('../src/services/razorpay', () => {
  const actual = jest.requireActual('../src/services/razorpay');
  const f = jest.requireActual('./fakeRazorpay').fake;
  return { ...actual, createOrder: f.createOrder, fetchPayment: f.fetchPayment, fetchOrderPayments: f.fetchOrderPayments, capturePayment: f.capturePayment };
});

import request from 'supertest';
import app from '../src/app';
import UserSubscription from '../src/models/UserSubscription';
import { transactionsSupported } from '../src/services/tx';
import { startDb, stopDb, resetDb, makeUser } from './setup';

beforeAll(() => startDb(false));
afterAll(() => stopDb());
beforeEach(async () => { await resetDb(); store.reset(); });

it('runs without transactions and still activates exactly once under concurrency', async () => {
  expect(await transactionsSupported()).toBe(false);
  const u = await makeUser();
  const c = await request(app).post('/api/billing/checkout').set('Authorization', `Bearer ${u.token}`).send({ planCode: 'premium' });
  const rp = payOrder(c.body.checkout.orderId);
  const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: rp } } });
  await Promise.all([
    ...[1, 2, 3].map((i) => request(app).post('/api/billing/webhook/razorpay').set('Content-Type', 'application/json')
      .set('X-Razorpay-Signature', webhookSignature(body)).set('X-Razorpay-Event-Id', `evt_${i}`).send(body)),
    request(app).post('/api/billing/verify').set('Authorization', `Bearer ${u.token}`)
      .send({ razorpay_order_id: rp.order_id, razorpay_payment_id: rp.id, razorpay_signature: checkoutSignature(rp.order_id, rp.id) }),
  ]);
  expect(await UserSubscription.countDocuments()).toBe(1);
});

it('without transactions, concurrent quota requests still give a Free user exactly one credit', async () => {
  const { consume } = await import('../src/services/quota');
  const UsageCounter = (await import('../src/models/UsageCounter')).default;
  const u = await makeUser();
  const results = await Promise.allSettled([
    ...Array.from({ length: 10 }, (_, i) => consume(u.id, 'quiz_play', `play:g${i}:1`)),
    ...Array.from({ length: 10 }, () => consume(u.id, 'quiz_play', 'play:same:1')),
  ]);
  expect(results.some((r) => r.status === 'fulfilled')).toBe(true);
  const c = await UsageCounter.findOne({ credit: 'quiz_play' });
  expect(c!.used + c!.reserved).toBe(1);
});
