import request from 'supertest';
import { Types } from 'mongoose';
import { start, stop, reset, makeUser, joinGame, quizUrl, wait } from './harness';
import Quiz from '../src/models/Quiz';
import GameInvite from '../src/models/GameInvite';
import { expireInvites } from '../src/services/inviteService';

const FREE_PLAY_MSG = 'You have used your free quiz limit for today. Upgrade to Premium to play unlimited quizzes.';
const HOUR = 3_600_000;

beforeAll(() => start());
afterAll(() => stop());
beforeEach(() => reset());

const api = () => request(quizUrl);

async function createCustomQuiz(token: string, extra: Record<string, unknown> = {}) {
  return api().post('/api/quizzes').set('Authorization', `Bearer ${token}`).send({
    title: 'My game', questionCount: 5, selectionMode: 'manual',
    scheduledAt: new Date(Date.now() + 2 * HOUR).toISOString(), ...extra,
  });
}

/** A quiz straight in the DB (e.g. today's daily game, already live). */
async function makeQuiz(createdBy: string, opts: Partial<{ status: string; participation: string; allowedUsers: string[]; scheduledAt: Date; kind: string }> = {}) {
  return Quiz.create({
    title: 'Daily GK', questionCount: 5, selectionMode: 'manual', kind: opts.kind ?? 'daily',
    scheduledAt: opts.scheduledAt ?? new Date(Date.now() - 5 * 60_000), durationMinutes: 30,
    status: opts.status ?? 'active', startedAt: (opts.status ?? 'active') === 'active' ? new Date(Date.now() - 5 * 60_000) : null,
    participation: opts.participation ?? 'public',
    allowedUsers: (opts.allowedUsers ?? []).map((id) => new Types.ObjectId(id)),
    createdBy: new Types.ObjectId(createdBy),
  });
}

async function quotaOf(token: string, billing: string) {
  // billing's public quota endpoint, as the web app would call it
  const { billingUrl } = await import('./harness');
  void billing;
  return (await request(billingUrl).get('/api/billing/quota').set('Authorization', `Bearer ${token}`)).body.quota;
}

describe('quiz creation quota', () => {
  it('Free: one custom quiz per day, then a clear upgrade message', async () => {
    const u = await makeUser();
    const first = await createCustomQuiz(u.token);
    expect(first.status).toBe(201);
    expect(first.body.quiz.kind).toBe('custom');
    const second = await createCustomQuiz(u.token);
    expect(second.status).toBe(403);
    expect(second.body.code).toBe('QUOTA_EXCEEDED');
    expect(second.body.upgradeTo).toBe('premium');
  });

  it('Premium users are never blocked', async () => {
    const u = await makeUser('user', 'premium');
    for (let i = 0; i < 4; i++) expect((await createCustomQuiz(u.token)).status).toBe(201);
  });

  it('admin quizzes are daily quizzes and cost nothing', async () => {
    const a = await makeUser('admin');
    for (let i = 0; i < 3; i++) {
      const r = await createCustomQuiz(a.token);
      expect(r.body.quiz.kind).toBe('daily');
    }
  });

  it('a failed creation gives the credit back', async () => {
    const u = await makeUser();
    // random mode with a topic that has no questions → creation fails after the credit was reserved
    const fail = await createCustomQuiz(u.token, { selectionMode: 'random', topic: new Types.ObjectId().toString() });
    expect(fail.status).toBe(500);
    expect((await createCustomQuiz(u.token)).status).toBe(201);
  });

  it('concurrent creations cannot exceed the Free limit', async () => {
    const u = await makeUser();
    const results = await Promise.all(Array.from({ length: 8 }, () => createCustomQuiz(u.token)));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(await Quiz.countDocuments()).toBe(1);
  });

  it('fails closed when billing is unreachable', async () => {
    const u = await makeUser();
    const saved = process.env.BILLING_SERVICE_URL;
    process.env.BILLING_SERVICE_URL = 'http://127.0.0.1:1';
    const r = await createCustomQuiz(u.token);
    process.env.BILLING_SERVICE_URL = saved;
    expect(r.status).toBe(503);
    expect(r.body.code).toBe('QUOTA_UNAVAILABLE');
  });
});

describe('daily quiz play', () => {
  it('Free: one play per day; replaying the same game is free; a second game is blocked with the exact message', async () => {
    const admin = await makeUser('admin');
    const u = await makeUser();
    const g1 = await makeQuiz(admin.id);
    const g2 = await makeQuiz(admin.id);

    const a = await joinGame(u.token, g1.id);
    expect(a.event).toBe('players_list');
    a.socket.disconnect();

    const again = await joinGame(u.token, g1.id);
    expect(again.event).toBe('players_list');
    again.socket.disconnect();

    const b = await joinGame(u.token, g2.id);
    expect(b.event).toBe('game_error');
    expect(b.data.message).toBe(FREE_PLAY_MSG);
    expect(b.data.code).toBe('QUOTA_EXCEEDED');
    b.socket.disconnect();
  });

  it('Premium players are never blocked', async () => {
    const admin = await makeUser('admin');
    const u = await makeUser('user', 'premium');
    for (let i = 0; i < 3; i++) {
      const g = await makeQuiz(admin.id);
      const r = await joinGame(u.token, g.id);
      expect(r.event).toBe('players_list');
      r.socket.disconnect();
    }
  });

  it('remaining quota is visible to the web app', async () => {
    const admin = await makeUser('admin');
    const u = await makeUser();
    const g = await makeQuiz(admin.id);
    const r = await joinGame(u.token, g.id);
    r.socket.disconnect();
    const q = await quotaOf(u.token, '');
    expect(q.credits.quiz_play).toMatchObject({ limit: 1, used: 1, remaining: 0 });
    expect(q.practice.consumesCredits).toBe(false);
  });

  it('waiting in the lobby holds the credit; leaving the lobby gives it back', async () => {
    const admin = await makeUser('admin');
    const u = await makeUser();
    const lobby = await makeQuiz(admin.id, { status: 'scheduled', scheduledAt: new Date(Date.now() + HOUR) });
    const live = await makeQuiz(admin.id);

    const r = await joinGame(u.token, lobby.id);
    expect(r.event).toBe('players_list');
    expect((await quotaOf(u.token, '')).credits.quiz_play.reserved).toBe(1);
    r.socket.disconnect();
    await wait(400);
    expect((await quotaOf(u.token, '')).credits.quiz_play.remaining).toBe(1);

    const p = await joinGame(u.token, live.id);
    expect(p.event).toBe('players_list');
    p.socket.disconnect();
  });
});

describe('invite-only games', () => {
  it('only invited players, the host and admins can join', async () => {
    const host = await makeUser('user', 'premium');
    const guest = await makeUser();
    const stranger = await makeUser();
    const g = await makeQuiz(host.id, { participation: 'invite_only', allowedUsers: [guest.id], kind: 'custom' });

    const s = await joinGame(stranger.token, g.id);
    expect(s.event).toBe('game_error');
    expect(s.data.code).toBe('NOT_INVITED');
    s.socket.disconnect();

    const ok = await joinGame(guest.token, g.id);
    expect(ok.event).toBe('players_list');
    ok.socket.disconnect();

    const h = await joinGame(host.token, g.id);
    expect(h.event).toBe('players_list');
    h.socket.disconnect();
  });

  it('the host plays their own game without using a credit', async () => {
    const host = await makeUser();
    const g = await makeQuiz(host.id, { participation: 'invite_only', kind: 'custom' });
    const r = await joinGame(host.token, g.id);
    expect(r.event).toBe('players_list');
    r.socket.disconnect();
    expect((await quotaOf(host.token, '')).credits.quiz_play.remaining).toBe(1);
  });
});

describe('game invites', () => {
  async function setup() {
    const host = await makeUser('user', 'premium');
    const created = await createCustomQuiz(host.token, { participation: 'invite_only' });
    return { host, quizId: created.body.quiz._id as string };
  }

  const invite = (token: string, quizId: string, userIds: string[]) =>
    api().post(`/api/quizzes/${quizId}/invites`).set('Authorization', `Bearer ${token}`).send({ userIds });
  const act = (token: string, inviteId: string, action: string) =>
    api().post(`/api/quizzes/invites/${inviteId}/${action}`).set('Authorization', `Bearer ${token}`);

  it('blocks inviting a Free user who already used today’s play, with the exact message', async () => {
    const admin = await makeUser('admin');
    const { host, quizId } = await setup();
    const free = await makeUser();
    const daily = await makeQuiz(admin.id);
    (await joinGame(free.token, daily.id)).socket.disconnect();

    const res = await invite(host.token, quizId, [free.id]);
    expect(res.body.results[0]).toMatchObject({ status: 'blocked', code: 'QUOTA_EXCEEDED', message: FREE_PLAY_MSG });
    expect((await Quiz.findById(quizId))!.allowedUsers).toHaveLength(0);
  });

  it('paid invitees are always invitable', async () => {
    const admin = await makeUser('admin');
    const { host, quizId } = await setup();
    const paid = await makeUser('user', 'premium');
    (await joinGame(paid.token, (await makeQuiz(admin.id)).id)).socket.disconnect();
    const res = await invite(host.token, quizId, [paid.id]);
    expect(res.body.results[0].status).toBe('invited');
  });

  it('accepting holds the credit; declining gives it back', async () => {
    const admin = await makeUser('admin');
    const { host, quizId } = await setup();
    const free = await makeUser();
    const inv = (await invite(host.token, quizId, [free.id])).body.results[0];

    expect((await act(free.token, inv.inviteId, 'accept')).status).toBe(200);
    const daily = await makeQuiz(admin.id);
    const blocked = await joinGame(free.token, daily.id);
    expect(blocked.data.message).toBe(FREE_PLAY_MSG);
    blocked.socket.disconnect();

    expect((await act(free.token, inv.inviteId, 'decline')).status).toBe(200);
    const ok = await joinGame(free.token, daily.id);
    expect(ok.event).toBe('players_list');
    ok.socket.disconnect();
  });

  it('accepting a second invite when the credit is held is refused with the upgrade message', async () => {
    const free = await makeUser();
    const a = await setup();
    const b = await setup();
    const i1 = (await invite(a.host.token, a.quizId, [free.id])).body.results[0];
    const i2 = (await invite(b.host.token, b.quizId, [free.id])).body.results[0];
    expect((await act(free.token, i1.inviteId, 'accept')).status).toBe(200);
    const r = await act(free.token, i2.inviteId, 'accept');
    expect(r.status).toBe(403);
    expect(r.body.message).toBe(FREE_PLAY_MSG);
  });

  it('concurrent accepts of different invites cannot both take the one credit', async () => {
    const free = await makeUser();
    const games = await Promise.all([setup(), setup(), setup(), setup()]);
    const ids = [];
    for (const g of games) ids.push((await invite(g.host.token, g.quizId, [free.id])).body.results[0].inviteId);
    const results = await Promise.all(ids.map((id) => act(free.token, id, 'accept')));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(await GameInvite.countDocuments({ status: 'accepted' })).toBe(1);
  });

  it('the host can cancel (credit returned, player removed); others cannot', async () => {
    const { host, quizId } = await setup();
    const free = await makeUser();
    const other = await makeUser();
    const inv = (await invite(host.token, quizId, [free.id])).body.results[0];
    await act(free.token, inv.inviteId, 'accept');

    expect((await act(other.token, inv.inviteId, 'cancel')).status).toBe(403);
    expect((await act(host.token, inv.inviteId, 'cancel')).status).toBe(200);
    expect((await Quiz.findById(quizId))!.allowedUsers.map(String)).not.toContain(free.id);
    expect((await quotaOf(free.token, '')).credits.quiz_play.remaining).toBe(1);
  });

  it('an expired invite gives the credit back', async () => {
    const { host, quizId } = await setup();
    const free = await makeUser();
    const inv = (await invite(host.token, quizId, [free.id])).body.results[0];
    await act(free.token, inv.inviteId, 'accept');
    await GameInvite.updateOne({ _id: inv.inviteId }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await expireInvites()).toBe(1);
    expect((await GameInvite.findById(inv.inviteId))!.status).toBe('expired');
    expect((await quotaOf(free.token, '')).credits.quiz_play.remaining).toBe(1);
  });

  it('cancelling the whole game before it starts frees every accepted invitee', async () => {
    const admin = await makeUser('admin');
    const host = await makeUser('admin');
    const created = await createCustomQuiz(host.token, { participation: 'invite_only' });
    const quizId = created.body.quiz._id;
    const f1 = await makeUser(); const f2 = await makeUser();
    const res = await invite(host.token, quizId, [f1.id, f2.id]);
    for (const r of res.body.results) await act(r.userId === f1.id ? f1.token : f2.token, r.inviteId, 'accept');

    await api().patch(`/api/quizzes/${quizId}`).set('Authorization', `Bearer ${admin.token}`).send({ status: 'cancelled' });
    await wait(400);
    expect((await quotaOf(f1.token, '')).credits.quiz_play.remaining).toBe(1);
    expect((await quotaOf(f2.token, '')).credits.quiz_play.remaining).toBe(1);
    expect(await GameInvite.countDocuments({ status: 'cancelled' })).toBe(2);
  });

  it('accepted invitee joins the game using the credit they were holding', async () => {
    const { host, quizId } = await setup();
    const free = await makeUser();
    const inv = (await invite(host.token, quizId, [free.id])).body.results[0];
    await act(free.token, inv.inviteId, 'accept');
    await Quiz.updateOne({ _id: quizId }, { $set: { status: 'active', startedAt: new Date() } });
    const r = await joinGame(free.token, quizId);
    expect(r.event).toBe('players_list');
    r.socket.disconnect();
    const q = await quotaOf(free.token, '');
    expect(q.credits.quiz_play).toMatchObject({ used: 1, reserved: 0 });
  });

  it('lists my open invites with whether I can still play', async () => {
    const { host, quizId } = await setup();
    const free = await makeUser();
    await invite(host.token, quizId, [free.id]);
    const r = await api().get('/api/quizzes/my/invites').set('Authorization', `Bearer ${free.token}`);
    expect(r.body.invites).toHaveLength(1);
    expect(r.body.invites[0].canPlay.allowed).toBe(true);
  });

  it('creating a quiz with invitees sends invites through the same checks', async () => {
    const host = await makeUser('user', 'premium');
    const a = await makeUser();
    const r = await createCustomQuiz(host.token, { participation: 'invite_only', allowedUsers: [a.id] });
    expect(r.body.inviteResults[0].status).toBe('invited');
    expect(r.body.quiz.allowedUsers).toEqual([a.id]);
  });
});
