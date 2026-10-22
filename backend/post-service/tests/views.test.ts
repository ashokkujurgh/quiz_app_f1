const stored = new Map<string, Buffer>();
jest.mock('../src/config/spaces', () => ({
  isStorageConfigured: () => true,
  putPublicObject: jest.fn(async (key: string, body: Buffer) => { stored.set(key, body); return `https://cdn.example.test/${key}`; }),
  deleteObject: jest.fn(async () => undefined),
}));

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import Post from '../src/models/Post';
import PremiumPostRevision from '../src/models/PremiumPostRevision';
import PendingView from '../src/models/PendingView';
import { retryPendingViews, issueViewToken } from '../src/services/viewTracking';
import { start, stop, reset, makeUser, png, LONG_TEXT } from './harness';

const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36';
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
const db = () => mongoose.connection.db!;
const credits = () => db().collection('ledgerentries').countDocuments({ type: 'view_credit' });

beforeAll(() => start());
afterAll(() => stop());
beforeEach(async () => {
  await reset();
  process.env.PREMIUM_SCREENING_ENABLED = 'false';
  process.env.AUTH_SERVICE_URL = 'http://127.0.0.1:1';
  process.env.VIEW_TOKEN_SECRET = 'test-view-secret';
  process.env.VIEW_MIN_DWELL_SECONDS = '0';
});

async function publishedPost() {
  const creator = await makeUser('user', 'creator');
  const reviewer = await makeUser('reviewer');
  const up = await request(app).post('/api/posts/premium/upload').set(auth(creator.token)).attach('image', await png(1200, 630), 'c.png');
  const d = await request(app).post('/api/posts/premium').set(auth(creator.token)).send({ title: 'Monsoon in India: exam notes', content: LONG_TEXT, topic: 'Geography', coverImage: up.body.image.url });
  await request(app).post(`/api/posts/premium/${d.body.post.id}/submit`).set(auth(creator.token));
  const rev = await PremiumPostRevision.findOne();
  await request(app).post(`/api/moderation/${rev!._id}/approve`).set(auth(reviewer.token)).send({});
  const post = (await Post.findOne({ isPremium: true }))!;
  return { creator, premiumId: d.body.post.id as string, post };
}

/** A browser: reads the post (gets a token + cookie), then reports the view. */
async function readAndView(agent: ReturnType<typeof request.agent>, slug: string, headers: Record<string, string> = {}) {
  const g = await agent.get(`/api/posts/${slug}`).set('User-Agent', UA).set(headers);
  const v = await agent.post(`/api/posts/${g.body.post?._id}/view`).set('User-Agent', UA).set(headers).send({ viewToken: g.body.viewToken });
  return { get: g, view: v };
}

it('an anonymous reader earns the creator exactly 10 paise; refreshing does not add more', async () => {
  const { post } = await publishedPost();
  const browser = request.agent(app);
  const r = await readAndView(browser, post.slug!);
  expect(r.get.body.viewToken).toBeTruthy();
  expect(String(r.get.headers['set-cookie'])).toMatch(/mz_vid=.*HttpOnly/);
  expect(r.view.body).toEqual({ success: true });
  expect(await credits()).toBe(1);
  const e = await db().collection('ledgerentries').findOne({ type: 'view_credit' });
  expect(e!.amountPaise).toBe(10);
  for (let i = 0; i < 3; i++) await readAndView(browser, post.slug!);
  expect(await credits()).toBe(1);
});

it('different readers each count; logged-in readers count once each', async () => {
  const { post } = await publishedPost();
  await readAndView(request.agent(app), post.slug!);
  await readAndView(request.agent(app), post.slug!);
  const u = await makeUser();
  await readAndView(request.agent(app), post.slug!, auth(u.token));
  await readAndView(request.agent(app), post.slug!, auth(u.token)); // same account, other browser
  expect(await credits()).toBe(3);
});

it('the page cannot send counts: no token, forged, other-post or other-viewer tokens are ignored', async () => {
  const { post } = await publishedPost();
  const a = request.agent(app);
  await a.post(`/api/posts/${post._id}/view`).set('User-Agent', UA).send({ count: 100 });
  await a.post(`/api/posts/${post._id}/view`).set('User-Agent', UA).send({ viewToken: 'eyJwIjoiMSJ9.forged' });
  const otherId = new mongoose.Types.ObjectId().toString();
  await a.post(`/api/posts/${post._id}/view`).set('User-Agent', UA).send({ viewToken: issueViewToken(otherId, 'a:abcdefghijklmnop') });
  // Token taken from one browser and replayed from another (no matching cookie)
  const g = await request.agent(app).get(`/api/posts/${post.slug}`).set('User-Agent', UA);
  await request(app).post(`/api/posts/${post._id}/view`).set('User-Agent', UA).send({ viewToken: g.body.viewToken });
  expect(await credits()).toBe(0);
});

it('a view reported before the minimum reading time is ignored', async () => {
  process.env.VIEW_MIN_DWELL_SECONDS = '5';
  const { post } = await publishedPost();
  await readAndView(request.agent(app), post.slug!);
  expect(await credits()).toBe(0);
});

it('bots get no token and are never counted', async () => {
  const { post } = await publishedPost();
  const bot = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
  const a = request.agent(app);
  const g = await a.get(`/api/posts/${post.slug}`).set('User-Agent', bot);
  expect(g.body.viewToken).toBeUndefined();
  expect(g.status).toBe(200); // still fully readable (and indexable)
  const human = await request.agent(app).get(`/api/posts/${post.slug}`).set('User-Agent', UA);
  await request(app).post(`/api/posts/${post._id}/view`).set('User-Agent', bot).set('Cookie', String(human.headers['set-cookie'])).send({ viewToken: human.body.viewToken });
  expect(await credits()).toBe(0);
});

it('the creator earns nothing from their own views — logged in, or logged out on the same browser', async () => {
  const { creator, post } = await publishedPost();
  const browser = request.agent(app);
  const me = await readAndView(browser, post.slug!, auth(creator.token));
  expect(me.get.body.viewToken).toBeUndefined();
  const loggedOut = await readAndView(browser, post.slug!);
  expect(loggedOut.get.body.viewToken).toBeUndefined();
  expect(await credits()).toBe(0);
});

it('10 simultaneous reports of one view credit once', async () => {
  const { post } = await publishedPost();
  const a = request.agent(app);
  const g = await a.get(`/api/posts/${post.slug}`).set('User-Agent', UA);
  await Promise.all(Array.from({ length: 10 }, () => a.post(`/api/posts/${post._id}/view`).set('User-Agent', UA).send({ viewToken: g.body.viewToken })));
  expect(await credits()).toBe(1);
});

it('unpublished posts and ordinary posts never earn', async () => {
  const { creator, premiumId, post } = await publishedPost();
  const a = request.agent(app);
  const g = await a.get(`/api/posts/${post.slug}`).set('User-Agent', UA);
  await request(app).post(`/api/posts/premium/${premiumId}/unpublish`).set(auth(creator.token));
  await a.post(`/api/posts/${post._id}/view`).set('User-Agent', UA).send({ viewToken: g.body.viewToken });
  expect(await credits()).toBe(0);

  const ordinary = await Post.create({ author: { userId: new mongoose.Types.ObjectId(), name: 'U', username: 'u' }, content: 'hello', topic: 'GS', slug: 'ordinary-post' });
  expect((await request(app).get(`/api/posts/${ordinary.slug}`).set('User-Agent', UA)).body.viewToken).toBeUndefined();
});

it('views are kept and delivered later when billing is down', async () => {
  const { post } = await publishedPost();
  const saved = process.env.BILLING_SERVICE_URL;
  const a = request.agent(app);
  const g = await a.get(`/api/posts/${post.slug}`).set('User-Agent', UA);
  process.env.BILLING_SERVICE_URL = 'http://127.0.0.1:1';
  await a.post(`/api/posts/${post._id}/view`).set('User-Agent', UA).send({ viewToken: g.body.viewToken });
  process.env.BILLING_SERVICE_URL = saved;
  expect(await PendingView.countDocuments()).toBe(1);
  await PendingView.updateMany({}, { $set: { nextAttemptAt: new Date(Date.now() - 1000) } });
  expect(await retryPendingViews()).toBe(1);
  expect(await credits()).toBe(1);
  expect(await PendingView.countDocuments()).toBe(0);
});

it("the creator's posts list shows each post's views and earnings from the server", async () => {
  const { creator, post } = await publishedPost();
  await readAndView(request.agent(app), post.slug!);
  await readAndView(request.agent(app), post.slug!);
  const r = await request(app).get('/api/posts/premium/mine').set(auth(creator.token));
  expect(r.body.statsAvailable).toBe(true);
  expect(r.body.posts[0].stats).toMatchObject({ eligibleViews: 2, earnedPaise: 20, estimatedPaise: 20, approvedPaise: 0 });
});

it('tracking is off (no tokens) when VIEW_TOKEN_SECRET is not set', async () => {
  const { post } = await publishedPost();
  delete process.env.VIEW_TOKEN_SECRET;
  expect((await request(app).get(`/api/posts/${post.slug}`).set('User-Agent', UA)).body.viewToken).toBeUndefined();
});
