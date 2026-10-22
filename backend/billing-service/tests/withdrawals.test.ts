import request from 'supertest';
import { Types } from 'mongoose';
import app from '../src/app';
import UserSubscription from '../src/models/UserSubscription';
import CreatorProfile from '../src/models/CreatorProfile';
import PayoutMethod from '../src/models/PayoutMethod';
import Withdrawal from '../src/models/Withdrawal';
import LedgerEntry from '../src/models/LedgerEntry';
import AuditLog from '../src/models/AuditLog';
import * as earnings from '../src/services/earnings';
import { reconcileWithdrawals } from '../src/services/withdrawals';
import { startDb, stopDb, resetDb, makeUser } from './setup';

const DAY = 86_400_000;
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

beforeAll(() => startDb(true));
afterAll(() => stopDb());
beforeEach(() => resetDb());

async function creatorWithBalance(paise = 50_000) {
  const c = await makeUser();
  const admin = await makeUser('admin');
  await UserSubscription.create({ userId: new Types.ObjectId(c.id), planCode: 'creator', tier: 2, startsAt: new Date(Date.now() - DAY), endsAt: new Date(Date.now() + 29 * DAY), source: 'admin_grant' });
  await CreatorProfile.create({ userId: new Types.ObjectId(c.id), displayName: 'Asha', guidelinesVersion: 'v', acceptedGuidelinesAt: new Date() });
  if (paise) await earnings.adjust(admin.id, c.id, paise, 'Test balance');
  return { c, admin };
}

const addUpi = (t: string) => request(app).post('/api/creator/payout-methods').set(bearer(t)).send({ type: 'upi', details: { upiId: 'asha.teacher@okaxis', name: 'Asha Kumari' } });
const withdraw = (t: string, methodId: string, amountPaise: number, idempotencyKey?: string) =>
  request(app).post('/api/creator/withdrawals').set(bearer(t)).send({ amountPaise, payoutMethodId: methodId, idempotencyKey });
const act = (t: string, id: string, action: string, body: object = {}) => request(app).post(`/api/billing/admin/withdrawals/${id}/${action}`).set(bearer(t)).send(body);
const balance = async (t: string) => (await request(app).get('/api/creator/balance').set(bearer(t))).body.balance;

describe('payout methods', () => {
  it('validates bank, UPI and gift-card details', async () => {
    const { c } = await creatorWithBalance(0);
    const add = (type: string, details: object) => request(app).post('/api/creator/payout-methods').set(bearer(c.token)).send({ type, details });
    expect((await add('bank', { holderName: 'Asha', accountNumber: '12ab', ifsc: 'SBIN0001234', bankName: 'SBI' })).status).toBe(400);
    expect((await add('bank', { holderName: 'Asha', accountNumber: '123456789012', ifsc: 'SBI1234', bankName: 'SBI' })).status).toBe(400);
    expect((await add('upi', { upiId: 'not-an-upi', name: 'Asha' })).status).toBe(400);
    expect((await add('amazon_gift_card', { deliveryEmail: 'nope' })).status).toBe(400);
    expect((await add('paypal', {})).status).toBe(400);
    expect((await add('bank', { holderName: 'Asha Kumari', accountNumber: '123456789012', ifsc: 'sbin0001234', bankName: 'State Bank of India' })).status).toBe(201);
  });

  it('stores details encrypted and shows them masked', async () => {
    const { c } = await creatorWithBalance(0);
    const r = await request(app).post('/api/creator/payout-methods').set(bearer(c.token)).send({ type: 'bank', details: { holderName: 'Asha Kumari', accountNumber: '123456789012', ifsc: 'SBIN0001234', bankName: 'SBI' } });
    expect(r.body.method.masked.accountNumber).toBe('••••••••9012');
    expect(JSON.stringify(r.body)).not.toContain('123456789012');
    const raw = await PayoutMethod.collection.findOne({});
    expect(JSON.stringify(raw)).not.toContain('123456789012');
    expect(JSON.stringify(await AuditLog.find().lean())).not.toContain('123456789012');
  });

  it('is disabled with a clear message when the encryption key is missing', async () => {
    const { c } = await creatorWithBalance(0);
    const saved = process.env.PAYOUT_ENCRYPTION_KEY;
    delete process.env.PAYOUT_ENCRYPTION_KEY;
    const r = await addUpi(c.token);
    process.env.PAYOUT_ENCRYPTION_KEY = saved;
    expect(r.status).toBe(503);
    expect(r.body.code).toBe('PAYOUTS_NOT_CONFIGURED');
  });
});

describe('requesting withdrawals', () => {
  it('below ₹100, above the available balance, or fractional amounts are refused', async () => {
    const { c } = await creatorWithBalance(15_000);
    const m = (await addUpi(c.token)).body.method.id;
    expect((await withdraw(c.token, m, 9_999)).body.code).toBe('BELOW_MINIMUM');
    expect((await withdraw(c.token, m, 15_001)).body.code).toBe('INSUFFICIENT_BALANCE');
    expect((await withdraw(c.token, m, 12_000.5)).status).toBe(400);
    expect((await withdraw(c.token, m, 15_000)).status).toBe(201);
  });

  it('pending (not yet cleared) earnings cannot be withdrawn', async () => {
    const { c } = await creatorWithBalance(0);
    const pid = new Types.ObjectId().toString();
    for (let i = 0; i < 20; i++) await earnings.recordView({ postId: pid, premiumPostId: pid, creatorId: c.id, viewerKey: `a:viewer${String(i).padStart(6, '0')}` });
    const m = (await addUpi(c.token)).body.method.id;
    const b = await balance(c.token);
    expect([b.estimatedPaise, b.availablePaise]).toEqual([200, 0]);
    expect((await withdraw(c.token, m, 10_000)).status).toBe(409);
  });

  it('holds the amount at once; only one open request at a time', async () => {
    const { c } = await creatorWithBalance(50_000);
    const m = (await addUpi(c.token)).body.method.id;
    await withdraw(c.token, m, 20_000);
    expect(await balance(c.token)).toMatchObject({ approvedPaise: 50_000, availablePaise: 30_000, inWithdrawalPaise: 20_000 });
    const second = await withdraw(c.token, m, 10_000);
    expect(second.status).toBe(409);
    expect(second.body.message).toMatch(/in progress/);
  });

  it('10 concurrent requests cannot overdraw or create two open withdrawals', async () => {
    const { c } = await creatorWithBalance(30_000);
    const m = (await addUpi(c.token)).body.method.id;
    const rs = await Promise.all(Array.from({ length: 10 }, () => withdraw(c.token, m, 20_000)));
    expect(rs.filter((r) => r.status === 201)).toHaveLength(1);
    expect(await Withdrawal.countDocuments()).toBe(1);
    expect(await LedgerEntry.countDocuments({ type: 'withdrawal_hold' })).toBe(1);
    expect((await balance(c.token)).availablePaise).toBe(10_000);
  });

  it('the same idempotency key (double click) returns the same request', async () => {
    const { c } = await creatorWithBalance(30_000);
    const m = (await addUpi(c.token)).body.method.id;
    const rs = await Promise.all([withdraw(c.token, m, 20_000, 'key-abcdef12'), withdraw(c.token, m, 20_000, 'key-abcdef12')]);
    expect(new Set(rs.map((r) => r.body.withdrawal?.id)).size).toBe(1);
    expect(await Withdrawal.countDocuments()).toBe(1);
  });

  it('withdrawals are blocked while Creator Premium has lapsed (balance kept) and for suspended creators', async () => {
    const { c } = await creatorWithBalance(30_000);
    const m = (await addUpi(c.token)).body.method.id;
    await UserSubscription.updateMany({}, { $set: { endsAt: new Date(Date.now() - 1000) } });
    const r = await withdraw(c.token, m, 10_000);
    expect(r.status).toBe(409);
    expect(r.body.message).toMatch(/Creator Premium/);
    expect((await balance(c.token)).availablePaise).toBe(30_000);
    await UserSubscription.updateMany({}, { $set: { endsAt: new Date(Date.now() + DAY) } });
    await CreatorProfile.updateOne({}, { $set: { status: 'suspended' } });
    expect((await withdraw(c.token, m, 10_000)).status).toBe(409);
  });
});

describe('admin payout workflow', () => {
  async function requested(amount = 20_000) {
    const ctx = await creatorWithBalance(50_000);
    const m = (await addUpi(ctx.c.token)).body.method.id;
    const w = (await withdraw(ctx.c.token, m, amount)).body.withdrawal;
    return { ...ctx, w };
  }

  it('happy path: review → approve → processing → paid with reference and confirmation', async () => {
    const { c, admin, w } = await requested();
    expect((await act(admin.token, w.id, 'review')).body.withdrawal.status).toBe('under_review');
    expect((await act(admin.token, w.id, 'approve')).body.withdrawal.status).toBe('approved');
    expect((await act(admin.token, w.id, 'process')).body.withdrawal.status).toBe('processing');
    expect((await act(admin.token, w.id, 'paid', { payoutReference: 'UTR123456789' })).body.code).toBe('CONFIRM_FULFILMENT');
    expect((await act(admin.token, w.id, 'paid', { confirmFulfilled: true })).status).toBe(400);
    const paid = await act(admin.token, w.id, 'paid', { payoutReference: 'UTR123456789', confirmFulfilled: true });
    expect(paid.body.withdrawal).toMatchObject({ status: 'paid', payoutReference: 'UTR123456789' });
    expect(await balance(c.token)).toMatchObject({ approvedPaise: 50_000, availablePaise: 30_000, inWithdrawalPaise: 0, paidPaise: 20_000 });
    const mine = await request(app).get(`/api/creator/withdrawals/${w.id}`).set(bearer(c.token));
    expect(mine.body.withdrawal.history.map((h: { status: string }) => h.status)).toEqual(['requested', 'under_review', 'approved', 'processing', 'paid']);
  });

  it('can never be marked paid before processing', async () => {
    const { admin, w } = await requested();
    const r = await act(admin.token, w.id, 'paid', { payoutReference: 'UTR1', confirmFulfilled: true });
    expect(r.body.code).toBe('BAD_TRANSITION');
    await act(admin.token, w.id, 'review'); await act(admin.token, w.id, 'approve');
    expect((await act(admin.token, w.id, 'paid', { payoutReference: 'UTR1', confirmFulfilled: true })).body.code).toBe('BAD_TRANSITION');
  });

  it('rejected and failed payouts return the money exactly once', async () => {
    const { c, admin, w } = await requested();
    const rs = await Promise.all([act(admin.token, w.id, 'reject', { reason: 'UPI name mismatch' }), act(admin.token, w.id, 'reject', { reason: 'UPI name mismatch' })]);
    expect(rs.filter((r) => r.status === 200)).toHaveLength(1);
    expect(await LedgerEntry.countDocuments({ type: 'withdrawal_release' })).toBe(1);
    expect((await balance(c.token)).availablePaise).toBe(50_000);

    const m = (await PayoutMethod.findOne())!._id.toString();
    const w2 = (await withdraw(c.token, m, 30_000)).body.withdrawal;
    for (const a of ['review', 'approve', 'process']) await act(admin.token, w2.id, a);
    expect((await act(admin.token, w2.id, 'failed', { reason: 'Bank returned the transfer' })).body.withdrawal.status).toBe('failed');
    expect(await balance(c.token)).toMatchObject({ availablePaise: 50_000, inWithdrawalPaise: 0, paidPaise: 0 });
    expect((await reconcileWithdrawals()).problems).toEqual([]);
  });

  it('creators can cancel before approval only', async () => {
    const { c, admin, w } = await requested();
    await act(admin.token, w.id, 'review'); await act(admin.token, w.id, 'approve');
    expect((await request(app).post(`/api/creator/withdrawals/${w.id}/cancel`).set(bearer(c.token))).body.code).toBe('BAD_TRANSITION');
    await act(admin.token, w.id, 'reject', { reason: 'Cancelled on request' });
    const m = (await PayoutMethod.findOne())!._id.toString();
    const w2 = (await withdraw(c.token, m, 10_000)).body.withdrawal;
    expect((await request(app).post(`/api/creator/withdrawals/${w2.id}/cancel`).set(bearer(c.token))).body.withdrawal.status).toBe('cancelled');
    expect((await balance(c.token)).availablePaise).toBe(50_000);
  });

  it('only admins act on payouts; reviewers, creators and the creator-admin themself cannot', async () => {
    const { c, w } = await requested();
    const reviewer = await makeUser('reviewer');
    for (const t of [c.token, reviewer.token]) {
      expect((await act(t, w.id, 'review')).status).toBe(403);
      expect((await request(app).get('/api/billing/admin/withdrawals').set(bearer(t))).status).toBe(403);
      expect((await request(app).get(`/api/billing/admin/withdrawals/${w.id}/payout-details`).set(bearer(t))).status).toBe(403);
    }
    await UserSubscription.db.collection('users').updateOne({ _id: new Types.ObjectId(c.id) }, { $set: { role: 'admin' } });
    expect((await act(c.token, w.id, 'review')).body.code).toBe('SELF_PAYOUT');
  });

  it('the secure detail view decrypts, is audited and not cached', async () => {
    const { admin, w } = await requested();
    const r = await request(app).get(`/api/billing/admin/withdrawals/${w.id}/payout-details`).set(bearer(admin.token));
    expect(r.body.payout.details).toEqual({ upiId: 'asha.teacher@okaxis', name: 'Asha Kumari' });
    expect(r.headers['cache-control']).toBe('no-store');
    expect(await AuditLog.countDocuments({ action: 'withdrawal.details_viewed' })).toBe(1);
    const list = await request(app).get('/api/billing/admin/withdrawals?status=open').set(bearer(admin.token));
    expect(JSON.stringify(list.body)).not.toContain('asha.teacher@okaxis');
  });

  it('CSV export is masked and safe to open in a spreadsheet', async () => {
    const { admin, w } = await requested();
    await act(admin.token, w.id, 'reject', { reason: '=HYPERLINK("http://evil")' });
    const r = await request(app).get('/api/billing/admin/withdrawals/export.csv').set(bearer(admin.token));
    expect(r.headers['content-type']).toMatch(/text\/csv/);
    expect(r.text).toContain('200.00');
    expect(r.text).not.toContain('asha.teacher@okaxis');
    expect(r.text).toContain(`"'=HYPERLINK(""http://evil"")"`);
  });

  it('balances stay consistent between the ledger and the dashboard numbers', async () => {
    const { c, admin, w } = await requested();
    for (const a of ['review', 'approve', 'process']) await act(admin.token, w.id, a);
    await act(admin.token, w.id, 'paid', { payoutReference: 'GC-ORDER-1', confirmFulfilled: true });
    expect(await earnings.balancesFromRollups(c.id)).toEqual(await earnings.balancesFromLedger(c.id));
  });
});
