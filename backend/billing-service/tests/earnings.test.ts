import request from 'supertest';
import { Types } from 'mongoose';
import app from '../src/app';
import UserSubscription from '../src/models/UserSubscription';
import CreatorProfile from '../src/models/CreatorProfile';
import ViewEvent from '../src/models/ViewEvent';
import LedgerEntry from '../src/models/LedgerEntry';
import DailyEarning from '../src/models/DailyEarning';
import User from '../src/models/User';
import * as earnings from '../src/services/earnings';
import { istDay } from '../src/utils/ist';
import { startDb, stopDb, resetDb, makeUser } from './setup';

const DAY = 86_400_000;
const SECRET = 'test-internal-secret';

beforeAll(() => startDb(true));
afterAll(() => stopDb());
beforeEach(() => resetDb());

async function makeCreator() {
  const c = await makeUser();
  await UserSubscription.create({ userId: new Types.ObjectId(c.id), planCode: 'creator', tier: 2, startsAt: new Date(Date.now() - DAY), endsAt: new Date(Date.now() + 29 * DAY), source: 'admin_grant' });
  await CreatorProfile.create({ userId: new Types.ObjectId(c.id), displayName: 'Asha', guidelinesVersion: 'v', acceptedGuidelinesAt: new Date() });
  return { ...c, postId: new Types.ObjectId().toString(), premiumPostId: new Types.ObjectId().toString() };
}

type C = Awaited<ReturnType<typeof makeCreator>>;
const anon = (n: number | string) => `a:anon${String(n).padStart(8, '0')}`;
const view = (c: C, viewerKey: string, extra: Partial<earnings.RecordViewInput> = {}) =>
  earnings.recordView({ postId: c.postId, premiumPostId: c.premiumPostId, creatorId: c.id, viewerKey, ...extra });

/** Move all of a creator's view data back by `days` (to test clearing). */
async function age(days: number) {
  for (const M of [LedgerEntry, DailyEarning, ViewEvent] as const) {
    const rows = await (M as typeof LedgerEntry).find({}).lean();
    for (const r of rows as { _id: Types.ObjectId; istDay: string }[]) {
      await (M as typeof LedgerEntry).updateOne({ _id: r._id }, { $set: { istDay: istDay(new Date(Date.parse(r.istDay) - days * DAY + 12 * 3600_000)) } });
    }
  }
}

describe('counting views', () => {
  it('credits exactly 10 paise per eligible view into the ledger', async () => {
    const c = await makeCreator();
    const r = await view(c, anon(1));
    expect(r).toMatchObject({ counted: true, eligible: true });
    const e = await LedgerEntry.findOne();
    expect([e!.type, e!.amountPaise, Number.isInteger(e!.amountPaise)]).toEqual(['view_credit', 10, true]);
    expect((await earnings.balancesFromLedger(c.id)).estimatedPaise).toBe(10);
  });

  it('the same viewer on the same post counts once per 24 h window', async () => {
    const c = await makeCreator();
    await view(c, anon(1));
    expect(await view(c, anon(1))).toMatchObject({ counted: false, duplicate: true });
    await view(c, anon(2));
    expect(await LedgerEntry.countDocuments()).toBe(2);
  });

  it('20 concurrent identical views produce one credit', async () => {
    const c = await makeCreator();
    const rs = await Promise.all(Array.from({ length: 20 }, () => view(c, anon(7))));
    expect(rs.filter((r) => r.counted)).toHaveLength(1);
    expect(await LedgerEntry.countDocuments()).toBe(1);
    expect((await DailyEarning.findOne())!.creditedPaise).toBe(10);
  });

  it('a creator viewing their own post earns nothing', async () => {
    const c = await makeCreator();
    expect(await view(c, `u:${c.id}`)).toMatchObject({ counted: true, eligible: false, reason: 'self_view' });
    expect(await LedgerEntry.countDocuments()).toBe(0);
  });

  it('no earnings while Creator Premium has lapsed (posts stay public; views are recorded unpaid)', async () => {
    const c = await makeCreator();
    await UserSubscription.updateMany({}, { $set: { endsAt: new Date(Date.now() - 1000) } });
    expect(await view(c, anon(1))).toMatchObject({ eligible: false, reason: 'creator_plan_inactive' });
    expect(await LedgerEntry.countDocuments()).toBe(0);
  });

  it('suspended creators and inactive viewer accounts earn nothing', async () => {
    const c = await makeCreator();
    const v = await makeUser();
    await User.updateOne({ _id: v.id }, { $set: { isActive: false } });
    expect(await view(c, `u:${v.id}`)).toMatchObject({ eligible: false, reason: 'viewer_inactive' });
    await CreatorProfile.updateOne({}, { $set: { status: 'suspended' } });
    expect(await view(c, anon(1))).toMatchObject({ eligible: false, reason: 'creator_suspended' });
  });

  it('many anonymous IDs from one network on one post in a day stop earning after the cap', async () => {
    process.env.VIEW_MAX_ANON_PER_IP_POST_DAY = '3';
    const c = await makeCreator();
    const rs = [];
    for (let i = 0; i < 6; i++) rs.push(await view(c, anon(i), { ipHash: 'net1' }));
    delete process.env.VIEW_MAX_ANON_PER_IP_POST_DAY;
    expect(rs.map((r) => r.eligible)).toEqual([true, true, true, false, false, false]);
    expect(rs[5].reason).toBe('suspicious_ip');
  });

  it('rejects malformed viewer keys and future timestamps are clamped', async () => {
    const c = await makeCreator();
    await expect(view(c, 'nobody')).rejects.toMatchObject({ status: 400 });
    await view(c, anon(1), { occurredAt: new Date(Date.now() + 10 * DAY).toISOString() });
    expect((await ViewEvent.findOne())!.occurredAt.getTime()).toBeLessThanOrEqual(Date.now());
  });
});

describe('balances', () => {
  it('estimated today → pending → approved after the hold; available = approved', async () => {
    const c = await makeCreator();
    for (let i = 0; i < 5; i++) await view(c, anon(i));
    let b = await earnings.balancesFromLedger(c.id);
    expect([b.estimatedPaise, b.pendingPaise, b.approvedPaise, b.availablePaise]).toEqual([50, 0, 0, 0]);
    await age(2);
    b = await earnings.balancesFromLedger(c.id);
    expect([b.estimatedPaise, b.pendingPaise, b.approvedPaise]).toEqual([0, 50, 0]);
    await age(7);
    b = await earnings.balancesFromLedger(c.id);
    expect([b.pendingPaise, b.approvedPaise, b.availablePaise]).toEqual([0, 50, 50]);
    expect(await earnings.balancesFromRollups(c.id)).toEqual(b);
  });

  it('admin reversals remove invalid views once, even when run twice at the same time', async () => {
    const c = await makeCreator();
    const a = await makeUser('admin');
    for (let i = 0; i < 4; i++) await view(c, anon(i));
    const day = istDay();
    const [n1, n2] = await Promise.all([
      earnings.reverseViews(a.id, { postId: c.postId, fromDay: day, toDay: day }, 'Bot traffic found'),
      earnings.reverseViews(a.id, { postId: c.postId, fromDay: day, toDay: day }, 'Bot traffic found'),
    ]);
    expect(n1 + n2).toBe(4);
    const b = await earnings.balancesFromLedger(c.id);
    expect([b.estimatedPaise, b.reversedPaise]).toEqual([0, 40]);
    expect(await LedgerEntry.countDocuments({ type: 'view_reversal' })).toBe(4);
    expect(await earnings.balancesFromRollups(c.id)).toEqual(b);
  });

  it('admin adjustments need integer paise and a reason; they count as approved', async () => {
    const c = await makeCreator();
    const a = await makeUser('admin');
    await expect(earnings.adjust(a.id, c.id, 12.5, 'bonus payment')).rejects.toMatchObject({ status: 400 });
    await expect(earnings.adjust(a.id, c.id, 500, '')).rejects.toMatchObject({ status: 400 });
    await earnings.adjust(a.id, c.id, 500, 'Contest prize');
    expect((await earnings.balancesFromLedger(c.id)).approvedPaise).toBe(500);
  });
});

describe('reconciliation', () => {
  it('repairs a wrong rollup and a missing credit from the ledger truth', async () => {
    const c = await makeCreator();
    for (let i = 0; i < 3; i++) await view(c, anon(i));
    await DailyEarning.updateOne({}, { $set: { creditedPaise: 999, eligibleViews: 99 } });
    // Simulate a crash after the view event but before its credit
    const ev = await ViewEvent.findOne();
    await LedgerEntry.deleteOne({ viewEventId: ev!._id });
    await ViewEvent.collection.updateOne({ _id: ev!._id }, { $set: { ledgerEntryId: null, createdAt: new Date(Date.now() - 5 * 60_000) } });

    const r = await earnings.reconcile({ days: 2 });
    expect(r.repairedCredits).toBe(1);
    expect(r.fixed).toBe(1);
    expect(await LedgerEntry.countDocuments({ type: 'view_credit' })).toBe(3);
    expect(await earnings.balancesFromRollups(c.id)).toEqual(await earnings.balancesFromLedger(c.id));
    expect((await earnings.reconcile({ days: 2 })).fixed).toBe(0);
  });
});

describe('APIs', () => {
  it('creator summary, analytics (gap-filled) and ledger; only for creators', async () => {
    const c = await makeCreator();
    for (let i = 0; i < 3; i++) await view(c, anon(i));
    const s = await request(app).get('/api/creator/earnings/summary').set('Authorization', `Bearer ${c.token}`);
    expect(s.body.summary.views).toMatchObject({ eligibleTotal: 3, today: 3, thisMonth: 3 });
    expect(s.body.summary.balances.estimatedPaise).toBe(30);
    expect(s.body.summary.disclaimer).toMatch(/can change/);

    const a = await request(app).get('/api/creator/earnings/analytics').set('Authorization', `Bearer ${c.token}`);
    expect(a.body.analytics.series).toHaveLength(30);
    expect(a.body.analytics.totals).toEqual({ eligibleViews: 3, earnedPaise: 30 });
    const m = await request(app).get('/api/creator/earnings/analytics?granularity=month').set('Authorization', `Bearer ${c.token}`);
    expect(m.body.analytics.series.length).toBeLessThanOrEqual(2);

    const l = await request(app).get('/api/creator/earnings/ledger').set('Authorization', `Bearer ${c.token}`);
    expect(l.body.total).toBe(3);
    expect(JSON.stringify(l.body)).not.toMatch(/viewerKey|ipHash/);

    const u = await makeUser();
    expect((await request(app).get('/api/creator/earnings/summary').set('Authorization', `Bearer ${u.token}`)).body.code).toBe('NOT_A_CREATOR');
  });

  it("a creator cannot read another creator's post analytics", async () => {
    const a = await makeCreator();
    const b = await makeCreator();
    await view(b, anon(1));
    const r = await request(app).get(`/api/creator/earnings/analytics?postId=${b.postId}`).set('Authorization', `Bearer ${a.token}`);
    expect(r.body.analytics.totals.eligibleViews).toBe(0);
  });

  it('creators cannot change views or earnings; admin tools need the admin role', async () => {
    const c = await makeCreator();
    const reviewer = await makeUser('reviewer');
    for (const t of [c.token, reviewer.token]) {
      expect((await request(app).post('/api/billing/admin/earnings/adjust').set('Authorization', `Bearer ${t}`).send({ creatorId: c.id, amountPaise: 100000, reason: 'please' })).status).toBe(403);
      expect((await request(app).post('/api/billing/admin/earnings/reverse').set('Authorization', `Bearer ${t}`).send({})).status).toBe(403);
    }
    expect((await request(app).post('/internal/views/record').send({ creatorId: c.id })).status).toBe(403);
  });

  it('internal record + per-post stats', async () => {
    const c = await makeCreator();
    const r = await request(app).post('/internal/views/record').set('x-internal-secret', SECRET)
      .send({ postId: c.postId, premiumPostId: c.premiumPostId, creatorId: c.id, viewerKey: anon(1) });
    expect(r.body.result.counted).toBe(true);
    const s = await request(app).post('/internal/earnings/posts').set('x-internal-secret', SECRET).send({ creatorId: c.id, postIds: [c.postId] });
    expect(s.body.stats[c.postId]).toMatchObject({ eligibleViews: 1, earnedPaise: 10, estimatedPaise: 10, approvedPaise: 0 });
  });
});
