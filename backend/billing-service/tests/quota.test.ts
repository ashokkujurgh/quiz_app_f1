import request from 'supertest';
import { Types } from 'mongoose';
import app from '../src/app';
import UsageCounter from '../src/models/UsageCounter';
import QuotaReservation from '../src/models/QuotaReservation';
import UserSubscription from '../src/models/UserSubscription';
import * as quota from '../src/services/quota';
import { istDay } from '../src/utils/ist';
import { startDb, stopDb, resetDb, makeUser } from './setup';

const DAY = 86_400_000;
const SECRET = 'test-internal-secret';

beforeAll(() => startDb(true));
afterAll(() => stopDb());
beforeEach(() => resetDb());

async function makePaid(userId: string, planCode: 'premium' | 'creator' = 'premium') {
  await UserSubscription.create({ userId: new Types.ObjectId(userId), planCode, tier: planCode === 'premium' ? 1 : 2,
    startsAt: new Date(Date.now() - DAY), endsAt: new Date(Date.now() + 29 * DAY), source: 'admin_grant' });
}

const internal = (path: string, body: object) =>
  request(app).post(`/internal/quota/${path}`).set('x-internal-secret', SECRET).send(body);

describe('IST day', () => {
  it('rolls over at 00:00 IST (18:30 UTC)', () => {
    expect(istDay(new Date('2026-10-22T18:29:59Z'))).toBe('2026-10-22');
    expect(istDay(new Date('2026-10-22T18:30:00Z'))).toBe('2026-10-23');
  });
});

describe('Free user', () => {
  it('gets exactly one quiz play, then the exact upgrade message', async () => {
    const u = await makeUser();
    await quota.consume(u.id, 'quiz_play', 'play:quizA:1');
    const res = await internal('consume', { userId: u.id, credit: 'quiz_play', refKey: 'play:quizB:1' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('QUOTA_EXCEEDED');
    expect(res.body.message).toBe('You have used your free quiz limit for today. Upgrade to Premium to play unlimited quizzes.');
    expect(res.body.upgradeTo).toBe('premium');
  });

  it('replaying the same quiz does not cost a second credit', async () => {
    const u = await makeUser();
    await quota.consume(u.id, 'quiz_play', 'play:quizA:1');
    await quota.consume(u.id, 'quiz_play', 'play:quizA:1');
    const c = await UsageCounter.findOne({ credit: 'quiz_play' });
    expect(c!.used).toBe(1);
  });

  it('play and create credits are separate', async () => {
    const u = await makeUser();
    await quota.consume(u.id, 'quiz_play', 'play:q:1');
    await expect(quota.consume(u.id, 'quiz_create', 'create:q1')).resolves.toBeTruthy();
    await expect(quota.consume(u.id, 'quiz_create', 'create:q2')).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED' });
  });

  it('a reserved credit counts as used until released, then can be used again', async () => {
    const u = await makeUser();
    await quota.reserve(u.id, 'quiz_play', 'play:invite:1');
    await expect(quota.reserve(u.id, 'quiz_play', 'play:other:1')).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED' });
    expect(await quota.release(u.id, 'quiz_play', 'play:invite:1', 'invite_cancelled')).toBe(true);
    await expect(quota.reserve(u.id, 'quiz_play', 'play:other:1')).resolves.toMatchObject({ status: 'reserved' });
  });

  it('a consumed credit is never released', async () => {
    const u = await makeUser();
    await quota.consume(u.id, 'quiz_play', 'play:q:1');
    expect(await quota.release(u.id, 'quiz_play', 'play:q:1', 'x')).toBe(false);
    expect((await UsageCounter.findOne())!.used).toBe(1);
  });

  it('20 concurrent requests for different quizzes yield exactly one success', async () => {
    const u = await makeUser();
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, (_, i) => quota.consume(u.id, 'quiz_play', `play:race${i}:1`))
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const c = await UsageCounter.findOne({ credit: 'quiz_play' });
    expect(c!.used + c!.reserved).toBe(1);
    expect(await QuotaReservation.countDocuments({ status: { $ne: 'released' } })).toBe(1);
  });

  it('20 concurrent requests for the same quiz all succeed but cost one credit', async () => {
    const u = await makeUser();
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => quota.consume(u.id, 'quiz_play', 'play:same:1')));
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    expect((await UsageCounter.findOne())!.used).toBe(1);
  });

  it('resets the next IST day', async () => {
    const u = await makeUser();
    await quota.consume(u.id, 'quiz_play', 'play:q:1');
    // Move yesterday's usage back one day
    await UsageCounter.updateMany({}, { $set: { istDay: istDay(new Date(Date.now() - DAY)) } });
    await expect(quota.consume(u.id, 'quiz_play', 'play:q2:1')).resolves.toBeTruthy();
  });

  it('expired reservations are released automatically', async () => {
    const u = await makeUser();
    await quota.reserve(u.id, 'quiz_play', 'play:inv:1');
    await QuotaReservation.updateOne({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await quota.releaseExpired()).toBe(1);
    expect((await quota.eligibility(u.id, 'quiz_play')).allowed).toBe(true);
  });

  it('releaseByRef frees every invitee of a cancelled game', async () => {
    const a = await makeUser(); const b = await makeUser();
    await quota.reserve(a.id, 'quiz_play', 'play:game:1');
    await quota.reserve(b.id, 'quiz_play', 'play:game:1');
    expect(await quota.releaseByRef('quiz_play', 'play:game:1', 'cancelled')).toBe(2);
    expect((await quota.eligibility(a.id, 'quiz_play')).remaining).toBe(1);
  });

  it('reconcile repairs a counter left wrong by a crash', async () => {
    const u = await makeUser();
    await quota.consume(u.id, 'quiz_play', 'play:q:1');
    await UsageCounter.updateOne({}, { $set: { used: 0, reserved: 3 } });
    expect(await quota.reconcileCounters()).toBe(1);
    const c = await UsageCounter.findOne();
    expect([c!.used, c!.reserved]).toEqual([1, 0]);
  });
});

describe('paid users and admins', () => {
  it('Premium users are never blocked', async () => {
    const u = await makeUser();
    await makePaid(u.id);
    for (let i = 0; i < 10; i++) await quota.consume(u.id, 'quiz_play', `play:p${i}:1`);
    for (let i = 0; i < 5; i++) await quota.consume(u.id, 'quiz_create', `create:c${i}`);
    expect(await UsageCounter.countDocuments()).toBe(0); // unlimited never touches counters
    expect((await quota.eligibility(u.id, 'quiz_play')).unlimited).toBe(true);
  });

  it('admins are never blocked', async () => {
    const a = await makeUser('admin');
    for (let i = 0; i < 5; i++) await quota.consume(a.id, 'quiz_create', `create:a${i}`);
  });

  it('when Premium expires the Free limit applies again', async () => {
    const u = await makeUser();
    await makePaid(u.id);
    await quota.consume(u.id, 'quiz_play', 'play:p1:1');
    await UserSubscription.updateOne({}, { $set: { endsAt: new Date(Date.now() - 1000) } });
    await quota.consume(u.id, 'quiz_play', 'play:p2:1');
    await expect(quota.consume(u.id, 'quiz_play', 'play:p3:1')).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED' });
  });
});

describe('APIs', () => {
  it('shows remaining credits and that practice is free', async () => {
    const u = await makeUser();
    await quota.consume(u.id, 'quiz_create', 'create:x');
    const res = await request(app).get('/api/billing/quota').set('Authorization', `Bearer ${u.token}`);
    expect(res.body.quota.credits.quiz_play).toMatchObject({ limit: 1, remaining: 1, unlimited: false });
    expect(res.body.quota.credits.quiz_create).toMatchObject({ remaining: 0 });
    expect(res.body.quota.practice).toEqual({ unlimited: true, consumesCredits: false });
  });

  it('eligibility explains why an action is unavailable', async () => {
    const u = await makeUser();
    await quota.consume(u.id, 'quiz_play', 'play:x:1');
    const res = await request(app).get('/api/billing/quota/eligibility?action=quiz_play').set('Authorization', `Bearer ${u.token}`);
    expect(res.body.eligibility).toMatchObject({ allowed: false, code: 'QUOTA_EXCEEDED', upgradeTo: 'premium' });
  });

  it('there is no practice credit to spend', async () => {
    const u = await makeUser();
    const res = await internal('consume', { userId: u.id, credit: 'practice', refKey: 'practice:1' });
    expect(res.status).toBe(400);
  });

  it('internal quota endpoints need the secret', async () => {
    const u = await makeUser();
    const res = await request(app).post('/internal/quota/consume').send({ userId: u.id, credit: 'quiz_play', refKey: 'play:x:1' });
    expect(res.status).toBe(403);
  });

  it('users cannot spend or release credits through the public API', async () => {
    const u = await makeUser();
    const res = await request(app).post('/api/billing/quota/release').set('Authorization', `Bearer ${u.token}`)
      .send({ userId: u.id, credit: 'quiz_play', refKey: 'play:x:1' });
    expect(res.status).toBe(404);
  });
});

describe('games on a later day', () => {
  it('an invite for tomorrow uses tomorrow’s credit, not today’s', async () => {
    const u = await makeUser();
    const tomorrow = istDay(new Date(Date.now() + DAY));
    await quota.consume(u.id, 'quiz_play', 'play:today:1');
    await expect(quota.reserve(u.id, 'quiz_play', 'play:tomorrow:1', undefined, tomorrow)).resolves.toMatchObject({ istDay: tomorrow });
    expect((await quota.eligibility(u.id, 'quiz_play', tomorrow)).allowed).toBe(false);
    expect((await quota.eligibility(u.id, 'quiz_play')).allowed).toBe(false);
  });

  it('refuses days too far ahead and treats past days as today', async () => {
    const u = await makeUser();
    await expect(quota.reserve(u.id, 'quiz_play', 'play:far:1', undefined, istDay(new Date(Date.now() + 30 * DAY)))).rejects.toMatchObject({ status: 400 });
    await expect(quota.reserve(u.id, 'quiz_play', 'play:past:1', undefined, '2020-01-01')).resolves.toMatchObject({ istDay: istDay() });
  });
});
