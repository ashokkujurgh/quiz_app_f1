// End-to-end: a Free user buys Creator Premium, onboards, publishes a reviewed premium post,
// earns from real views, the earnings clear, and an admin pays out a withdrawal.
// Real post-service + real billing-service on one database; Razorpay and storage are faked.
const stored = new Map<string, Buffer>();
jest.mock('../src/config/spaces', () => ({
  isStorageConfigured: () => true,
  putPublicObject: jest.fn(async (key: string, body: Buffer) => { stored.set(key, body); return `https://cdn.example.test/${key}`; }),
  deleteObject: jest.fn(async () => undefined),
}));
jest.mock('../../billing-service/src/services/razorpay', () => {
  const actual = jest.requireActual('../../billing-service/src/services/razorpay');
  const f = jest.requireActual('../../billing-service/tests/fakeRazorpay').fake;
  return { ...actual, createOrder: f.createOrder, fetchPayment: f.fetchPayment, fetchOrderPayments: f.fetchOrderPayments, capturePayment: f.capturePayment };
});

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import PremiumPostRevision from '../src/models/PremiumPostRevision';
import EmailOutbox from '../src/models/EmailOutbox';
import { payOrder, webhookSignature } from '../../billing-service/tests/fakeRazorpay';
import { start, stop, reset, makeUser, png, LONG_TEXT, billingUrl, GUIDELINES_VERSION } from './harness';

process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'rzp_test_webhook_secret';
process.env.PAYOUT_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64');
process.env.VIEW_TOKEN_SECRET = 'journey-view-secret';
process.env.VIEW_MIN_DWELL_SECONDS = '0';
process.env.PREMIUM_SCREENING_ENABLED = 'false';
process.env.AUTH_SERVICE_URL = 'http://127.0.0.1:1';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36';
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
const DAY = 86_400_000;

beforeAll(() => start());
afterAll(() => stop());
beforeEach(() => reset());

it('purchase → creator → reviewed premium post → views → cleared earnings → withdrawal → paid', async () => {
  const billing = () => request(billingUrl);
  const creator = await makeUser();               // Free user, no profile
  const reviewer = await makeUser('reviewer');
  const admin = await makeUser('admin');

  // 1. Free users can't create premium posts
  expect((await request(app).post('/api/posts/premium').set(auth(creator.token)).send({ title: 'x' })).body.code).toBe('CREATOR_NOT_ELIGIBLE');

  // 2. Buy Creator Premium: checkout → pay at Razorpay → signed webhook activates it (no browser callback needed)
  const co = await billing().post('/api/billing/checkout').set(auth(creator.token)).send({ planCode: 'creator' });
  expect(co.body.checkout).toMatchObject({ amountPaise: 9900, billingType: 'one_time' });
  const rp = payOrder(co.body.checkout.orderId);
  const hook = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: rp } } });
  await billing().post('/api/billing/webhook/razorpay').set('Content-Type', 'application/json')
    .set('X-Razorpay-Signature', webhookSignature(hook)).set('X-Razorpay-Event-Id', 'evt_journey').send(hook);
  const ent = await billing().get('/api/billing/entitlements').set(auth(creator.token));
  expect(ent.body.entitlements.plan.code).toBe('creator');

  // 3. Onboard as a creator
  const g = await billing().get('/api/creator/guidelines');
  expect(g.body.guidelines.version).toBe(GUIDELINES_VERSION);
  expect((await billing().post('/api/creator/apply').set(auth(creator.token)).send({ displayName: 'Asha Teaches', acceptGuidelines: true, guidelinesVersion: GUIDELINES_VERSION })).status).toBe(201);

  // 4. Write and submit a premium post
  const up = await request(app).post('/api/posts/premium/upload').set(auth(creator.token)).attach('image', await png(1200, 630), 'cover.png');
  const draft = await request(app).post('/api/posts/premium').set(auth(creator.token)).send({
    title: 'Fundamental Duties: complete notes for UPSC', content: LONG_TEXT, topic: 'General Studies', subTopic: 'Polity', tags: ['polity'], coverImage: up.body.image.url,
  });
  expect((await request(app).post(`/api/posts/premium/${draft.body.post.id}/submit`).set(auth(creator.token))).status).toBe(201);
  expect((await request(app).get('/api/posts')).body.posts).toHaveLength(0);       // nothing public before review

  // 5. Reviewer approves → public premium post, readable by everyone (incl. Free and logged-out)
  const rev = await PremiumPostRevision.findOne();
  expect((await request(app).post(`/api/moderation/${rev!._id}/approve`).set(auth(reviewer.token)).send({})).status).toBe(200);
  const feed = await request(app).get('/api/posts');
  expect(feed.body.posts).toHaveLength(1);
  expect(feed.body.posts[0].isPremium).toBe(true);
  const post = feed.body.posts[0];
  expect(await EmailOutbox.countDocuments({ template: 'post_approved' })).toBe(1);

  // 6. Readers view it: three through the real browser flow…
  for (let i = 0; i < 3; i++) {
    const browser = request.agent(app);
    const r = await browser.get(`/api/posts/${post.slug}`).set('User-Agent', UA);
    await browser.post(`/api/posts/${post._id}/view`).set('User-Agent', UA).send({ viewToken: r.body.viewToken });
  }
  // …and 1,000 more distinct readers delivered the same way post-service delivers them
  const views = Array.from({ length: 1000 }, (_, i) => ({ postId: post._id, premiumPostId: post.premium.premiumPostId, creatorId: creator.id, viewerKey: `a:reader${String(i).padStart(8, '0')}` }));
  for (let i = 0; i < views.length; i += 100) {
    await Promise.all(views.slice(i, i + 100).map((v) => billing().post('/internal/views/record').set('x-internal-secret', 'test-internal-secret').send(v)));
  }
  let summary = (await billing().get('/api/creator/earnings/summary').set(auth(creator.token))).body.summary;
  expect(summary.views.eligibleTotal).toBe(1003);
  expect(summary.balances).toMatchObject({ estimatedPaise: 10030, availablePaise: 0 });   // ₹100.30, not yet withdrawable

  // 7. Earnings clear after the hold period (simulate 8 days passing)
  const db = mongoose.connection.db!;
  for (const col of ['ledgerentries', 'dailyearnings', 'viewevents']) {
    await db.collection(col).updateMany({ istDay: { $exists: true } }, [{ $set: { istDay: { $dateToString: { format: '%Y-%m-%d', date: { $subtract: [{ $dateFromString: { dateString: '$istDay' } }, 8 * DAY] } } } } }]);
  }
  summary = (await billing().get('/api/creator/earnings/summary').set(auth(creator.token))).body.summary;
  expect(summary.balances).toMatchObject({ approvedPaise: 10030, availablePaise: 10030 });

  // 8. Withdraw ₹100 to UPI
  const m = await billing().post('/api/creator/payout-methods').set(auth(creator.token)).send({ type: 'upi', details: { upiId: 'asha@okaxis', name: 'Asha Kumari' } });
  const w = await billing().post('/api/creator/withdrawals').set(auth(creator.token)).send({ amountPaise: 10000, payoutMethodId: m.body.method.id, idempotencyKey: 'journey-withdraw-1' });
  expect(w.status).toBe(201);
  expect((await billing().get('/api/creator/balance').set(auth(creator.token))).body.balance).toMatchObject({ availablePaise: 30, inWithdrawalPaise: 10000 });

  // 9. Admin pays it out manually and records the reference
  for (const a of ['review', 'approve', 'process']) await billing().post(`/api/billing/admin/withdrawals/${w.body.withdrawal.id}/${a}`).set(auth(admin.token)).send({});
  const details = await billing().get(`/api/billing/admin/withdrawals/${w.body.withdrawal.id}/payout-details`).set(auth(admin.token));
  expect(details.body.payout.details.upiId).toBe('asha@okaxis');
  const paid = await billing().post(`/api/billing/admin/withdrawals/${w.body.withdrawal.id}/paid`).set(auth(admin.token)).send({ payoutReference: 'UPI-REF-778899', confirmFulfilled: true });
  expect(paid.body.withdrawal.status).toBe('paid');

  const finalBal = (await billing().get(`/api/billing/admin/creators/${creator.id}/balance`).set(auth(admin.token))).body;
  expect(finalBal.consistent).toBe(true);
  expect(finalBal.ledger).toMatchObject({ approvedPaise: 10030, availablePaise: 30, inWithdrawalPaise: 0, paidPaise: 10000 });
  expect((await billing().post('/api/billing/admin/withdrawals/reconcile').set(auth(admin.token))).body.result.problems).toEqual([]);
  expect((await billing().post('/api/billing/admin/earnings/reconcile').set(auth(admin.token)).send({ days: 30 })).body.result.fixed).toBe(0);
});
