import request from 'supertest';
import { Types } from 'mongoose';
import app from '../src/app';
import UserSubscription from '../src/models/UserSubscription';
import AuditLog from '../src/models/AuditLog';
import { GUIDELINES_VERSION } from '../src/config/creatorGuidelines';
import { startDb, stopDb, resetDb, makeUser } from './setup';

const DAY = 86_400_000;

beforeAll(() => startDb(true));
afterAll(() => stopDb());
beforeEach(() => resetDb());

async function givePlan(userId: string, planCode: 'premium' | 'creator', endsInDays = 29) {
  await UserSubscription.create({ userId: new Types.ObjectId(userId), planCode, tier: planCode === 'premium' ? 1 : 2,
    startsAt: new Date(Date.now() - DAY), endsAt: new Date(Date.now() + endsInDays * DAY), source: 'admin_grant' });
}

const apply = (token: string, body: object = {}) => request(app).post('/api/creator/apply').set('Authorization', `Bearer ${token}`)
  .send({ acceptGuidelines: true, guidelinesVersion: GUIDELINES_VERSION, displayName: 'Asha Teaches', ...body });
const me = async (token: string) => (await request(app).get('/api/creator/me').set('Authorization', `Bearer ${token}`)).body.creator;

it('guidelines are public and versioned', async () => {
  const r = await request(app).get('/api/creator/guidelines');
  expect(r.body.guidelines.version).toBe(GUIDELINES_VERSION);
  expect(r.body.guidelines.rules.length).toBeGreaterThan(3);
});

it('Free and ₹49 users cannot become creators', async () => {
  const free = await makeUser();
  const r1 = await apply(free.token);
  expect(r1.status).toBe(403);
  expect(r1.body.code).toBe('CREATOR_PLAN_REQUIRED');
  const p = await makeUser();
  await givePlan(p.id, 'premium');
  expect((await apply(p.token)).status).toBe(403);
  expect((await me(p.token)).canCreatePremium).toBe(false);
});

it('₹99 users must accept the current guidelines', async () => {
  const c = await makeUser();
  await givePlan(c.id, 'creator');
  expect((await apply(c.token, { acceptGuidelines: false })).status).toBe(400);
  expect((await apply(c.token, { guidelinesVersion: 'old' })).body.code).toBe('GUIDELINES_CHANGED');
  const ok = await apply(c.token);
  expect(ok.status).toBe(201);
  expect(ok.body.creator.canCreatePremium).toBe(true);
});

it('when Creator Premium expires the profile stays but creating is blocked with a reason', async () => {
  const c = await makeUser();
  await givePlan(c.id, 'creator');
  await apply(c.token);
  await UserSubscription.updateOne({}, { $set: { endsAt: new Date(Date.now() - 1000) } });
  const s = await me(c.token);
  expect(s.hasProfile).toBe(true);
  expect(s.canCreatePremium).toBe(false);
  expect(s.reasons[0]).toMatch(/Creator Premium/);
});

it('only admins can suspend creators, and it is logged', async () => {
  const c = await makeUser();
  await givePlan(c.id, 'creator');
  await apply(c.token);
  const other = await makeUser();
  expect((await request(app).post(`/api/billing/admin/creators/${c.id}/status`).set('Authorization', `Bearer ${other.token}`).send({ status: 'suspended', reason: 'x' })).status).toBe(403);
  const a = await makeUser('admin');
  const r = await request(app).post(`/api/billing/admin/creators/${c.id}/status`).set('Authorization', `Bearer ${a.token}`).send({ status: 'suspended', reason: 'Spam' });
  expect(r.status).toBe(200);
  expect((await me(c.token)).canCreatePremium).toBe(false);
  expect(await AuditLog.countDocuments({ action: 'creator.suspended' })).toBe(1);
  expect((await apply(c.token)).status).toBe(403);
});

it('internal creator status needs the secret', async () => {
  const c = await makeUser();
  expect((await request(app).get(`/internal/creators/${c.id}`)).status).toBe(403);
  const r = await request(app).get(`/internal/creators/${c.id}`).set('x-internal-secret', 'test-internal-secret');
  expect(r.body.creator.canCreatePremium).toBe(false);
});
