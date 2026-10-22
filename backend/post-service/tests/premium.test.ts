// Storage is faked in memory; everything else (billing, Mongo, sharp) is real.
const stored = new Map<string, Buffer>();
jest.mock('../src/config/spaces', () => ({
  isStorageConfigured: () => true,
  putPublicObject: jest.fn(async (key: string, body: Buffer) => { stored.set(key, body); return `https://cdn.example.test/${key}`; }),
  deleteObject: jest.fn(async (key: string) => { stored.delete(key); }),
}));

import request from 'supertest';
import sharp from 'sharp';
import mongoose from 'mongoose';
import app from '../src/app';
import Post from '../src/models/Post';
import PremiumPost from '../src/models/PremiumPost';
import PremiumPostRevision from '../src/models/PremiumPostRevision';
import { AiImageCandidate, AiImageUsage } from '../src/models/AiImage';
import { setOpenAIForTests, cleanupExpiredCandidates } from '../src/services/premiumImages';
import { start, stop, reset, makeUser, expirePlan, png, LONG_TEXT } from './harness';

beforeAll(() => start());
afterAll(() => stop());
beforeEach(async () => {
  await reset(); stored.clear();
  process.env.AI_IMAGE_ENABLED = 'true'; process.env.OPENAI_API_KEY = 'sk-test'; process.env.AI_IMAGE_DAILY_LIMIT = '2';
  process.env.PREMIUM_SCREENING_ENABLED = 'false'; // screening is covered in moderation.test.ts; never call the real API
  process.env.AUTH_SERVICE_URL = 'http://127.0.0.1:1'; // emails just queue (no network)
});

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

async function uploadImage(token: string, buf?: Buffer, name = 'cover.png') {
  return request(app).post('/api/posts/premium/upload').set(auth(token)).attach('image', buf ?? await png(1200, 630), name);
}

async function readyDraft(token: string) {
  const up = await uploadImage(token);
  const r = await request(app).post('/api/posts/premium').set(auth(token)).send({
    title: 'Indian Polity: Fundamental Rights explained', content: LONG_TEXT, topic: 'General Studies', subTopic: 'Polity',
    tags: ['polity', 'UPSC', '#rights'], coverImage: up.body.image.url,
  });
  return r.body.post;
}

describe('who can create premium posts', () => {
  it('Free and ₹49 users cannot', async () => {
    for (const plan of ['free', 'premium'] as const) {
      const u = await makeUser('user', plan);
      const r = await request(app).post('/api/posts/premium').set(auth(u.token)).send({ title: 'x' });
      expect(r.status).toBe(403);
      expect(r.body.code).toBe('CREATOR_NOT_ELIGIBLE');
    }
  });

  it('₹99 users must finish onboarding first', async () => {
    const u = await makeUser('user', 'creator', false);
    const r = await request(app).post('/api/posts/premium').set(auth(u.token)).send({ title: 'x' });
    expect(r.status).toBe(403);
    expect(r.body.reasons.join(' ')).toMatch(/onboarding/);
  });

  it('when the plan expires: no new posts, uploads or submissions, but existing posts stay readable and can be unpublished', async () => {
    const c = await makeUser('user', 'creator');
    const d = await readyDraft(c.token);
    await expirePlan(c.id);
    expect((await request(app).post('/api/posts/premium').set(auth(c.token)).send({})).status).toBe(403);
    expect((await uploadImage(c.token)).status).toBe(403);
    expect((await request(app).post(`/api/posts/premium/${d.id}/submit`).set(auth(c.token))).status).toBe(403);
    expect((await request(app).get(`/api/posts/premium/${d.id}`).set(auth(c.token))).status).toBe(200);
    expect((await request(app).get('/api/posts/premium/mine').set(auth(c.token))).body.total).toBe(1);
  });
});

describe('drafts', () => {
  it('saves drafts, sanitises HTML and normalises tags', async () => {
    const c = await makeUser('user', 'creator');
    const r = await request(app).post('/api/posts/premium').set(auth(c.token)).send({
      title: '  Draft   title  ', content: '<p>Hello<script>alert(1)</script> <a href="javascript:x">x</a></p>', tags: ['#UPSC', 'upsc', 'Polity'],
    });
    expect(r.status).toBe(201);
    expect(r.body.post.draft.title).toBe('Draft title');
    expect(r.body.post.draft.content).not.toMatch(/script|javascript/);
    expect(r.body.post.draft.tags).toEqual(['upsc', 'polity']);
    expect(r.body.post.displayStatus).toBe('draft');
  });

  it('rejects images that were not uploaded through Meenzo', async () => {
    const c = await makeUser('user', 'creator');
    const r = await request(app).post('/api/posts/premium').set(auth(c.token)).send({ coverImage: 'https://evil.example/tracker.png' });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('IMAGE_NOT_OWNED');
  });

  it("cannot use another creator's image or see their drafts", async () => {
    const a = await makeUser('user', 'creator');
    const b = await makeUser('user', 'creator');
    const up = await uploadImage(a.token);
    const draft = await readyDraft(a.token);
    expect((await request(app).post('/api/posts/premium').set(auth(b.token)).send({ coverImage: up.body.image.url })).status).toBe(400);
    expect((await request(app).get(`/api/posts/premium/${draft.id}`).set(auth(b.token))).status).toBe(404);
    expect((await request(app).patch(`/api/posts/premium/${draft.id}`).set(auth(b.token)).send({ title: 'hijack' })).status).toBe(404);
  });

  it('preview shows the checklist', async () => {
    const c = await makeUser('user', 'creator');
    const r = await request(app).post('/api/posts/premium').set(auth(c.token)).send({ title: 'Short' });
    const p = await request(app).get(`/api/posts/premium/${r.body.post.id}/preview`).set(auth(c.token));
    const failed = p.body.preview.checks.filter((x: { ok: boolean }) => !x.ok).map((x: { id: string }) => x.id);
    expect(failed).toEqual(expect.arrayContaining(['title', 'length', 'category', 'cover']));
  });
});

describe('image uploads', () => {
  it('accepts a real image, re-encodes it to WebP and strips metadata', async () => {
    const c = await makeUser('user', 'creator');
    const withExif = await sharp(await png(1200, 630)).jpeg().withMetadata({ exif: { IFD0: { Copyright: 'secret-gps' } } }).toBuffer();
    const r = await uploadImage(c.token, withExif, 'photo.jpg');
    expect(r.status).toBe(201);
    const saved = [...stored.values()][0];
    const meta = await sharp(saved).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.exif).toBeUndefined();
  });

  it('rejects fake images, wrong formats, tiny and oversized files', async () => {
    const c = await makeUser('user', 'creator');
    const fake = await uploadImage(c.token, Buffer.from('<?php echo 1; ?>'.repeat(50)), 'cover.png');
    expect(fake.status).toBe(415);
    const gif = await uploadImage(c.token, await sharp(await png(800, 600)).gif().toBuffer(), 'a.gif');
    expect(gif.body.code).toBe('IMAGE_FORMAT');
    const tiny = await uploadImage(c.token, await png(200, 200));
    expect(tiny.body.code).toBe('IMAGE_TOO_SMALL');
    const big = await uploadImage(c.token, Buffer.alloc(6 * 1024 * 1024, 1), 'big.png');
    expect(big.status).toBe(413);
    expect(stored.size).toBe(0);
  });
});

describe('submit for review', () => {
  it('incomplete posts are refused with the missing items', async () => {
    const c = await makeUser('user', 'creator');
    const r = await request(app).post('/api/posts/premium').set(auth(c.token)).send({ title: 'A good long title here' });
    const s = await request(app).post(`/api/posts/premium/${r.body.post.id}/submit`).set(auth(c.token));
    expect(s.status).toBe(422);
    expect(s.body.code).toBe('SUBMISSION_INCOMPLETE');
  });

  it('creates an immutable revision; nothing becomes public', async () => {
    const c = await makeUser('user', 'creator');
    const d = await readyDraft(c.token);
    const s = await request(app).post(`/api/posts/premium/${d.id}/submit`).set(auth(c.token));
    expect(s.status).toBe(201);
    expect(s.body.revision.version).toBe(1);
    const rev = await PremiumPostRevision.findOne();
    expect(rev!.status).toBe('in_review');
    expect(rev!.author.name).toBe('Asha Teaches');
    expect(await Post.countDocuments()).toBe(0);
    expect((await request(app).get('/api/posts')).body.posts).toHaveLength(0);

    // editing during review does not touch the submitted snapshot
    await request(app).patch(`/api/posts/premium/${d.id}`).set(auth(c.token)).send({ title: 'Changed while in review!!' });
    expect((await PremiumPostRevision.findOne())!.title).toBe('Indian Polity: Fundamental Rights explained');
  });

  it('double submits (even concurrent) create only one review item', async () => {
    const c = await makeUser('user', 'creator');
    const d = await readyDraft(c.token);
    const rs = await Promise.all(Array.from({ length: 5 }, () => request(app).post(`/api/posts/premium/${d.id}/submit`).set(auth(c.token))));
    expect(rs.filter((r) => r.status === 201)).toHaveLength(1);
    expect(await PremiumPostRevision.countDocuments()).toBe(1);
    expect((await PremiumPost.findById(d.id))!.version).toBe(1);
  });

  it('withdraw, then resubmit as a new version', async () => {
    const c = await makeUser('user', 'creator');
    const d = await readyDraft(c.token);
    await request(app).post(`/api/posts/premium/${d.id}/submit`).set(auth(c.token));
    const w = await request(app).post(`/api/posts/premium/${d.id}/withdraw`).set(auth(c.token));
    expect(w.body.post.displayStatus).toBe('draft');
    const again = await request(app).post(`/api/posts/premium/${d.id}/submit`).set(auth(c.token));
    expect(again.body.revision.version).toBe(2);
  });

  it('drafts can be deleted; posts in review cannot', async () => {
    const c = await makeUser('user', 'creator');
    const d = await readyDraft(c.token);
    await request(app).post(`/api/posts/premium/${d.id}/submit`).set(auth(c.token));
    expect((await request(app).delete(`/api/posts/premium/${d.id}`).set(auth(c.token))).status).toBe(409);
    await request(app).post(`/api/posts/premium/${d.id}/withdraw`).set(auth(c.token));
    expect((await request(app).delete(`/api/posts/premium/${d.id}`).set(auth(c.token))).status).toBe(200);
    expect((await request(app).get('/api/posts/premium/mine').set(auth(c.token))).body.total).toBe(0);
  });
});

describe('published premium posts are protected from bypassing review', () => {
  async function publishedPost() {
    const c = await makeUser('user', 'creator');
    const d = await readyDraft(c.token);
    // Simulate an approval (the reviewer flow arrives in Phase 5)
    const post = await Post.create({
      author: { userId: new mongoose.Types.ObjectId(c.id), name: 'Asha', username: 'asha', avatar: null },
      title: 'T', slug: `t-${Date.now()}`, content: '<p>x</p>', topic: 'GS', isPremium: true, approvalStatus: 'approved',
      premium: { premiumPostId: new mongoose.Types.ObjectId(d.id), revisionId: new mongoose.Types.ObjectId(), version: 1, tags: [], approvedAt: new Date() },
    });
    await PremiumPost.updateOne({ _id: d.id }, { $set: { status: 'published', reviewState: 'approved', publicPostId: post._id, liveRevisionId: new mongoose.Types.ObjectId() } });
    return { c, d, post };
  }

  it('the owner cannot edit or delete it through the ordinary post API', async () => {
    const { c, post } = await publishedPost();
    expect((await request(app).patch(`/api/posts/${post.id}`).set(auth(c.token)).send({ content: 'spam' })).body.code).toBe('PREMIUM_EDIT_VIA_REVIEW');
    expect((await request(app).delete(`/api/posts/${post.id}`).set(auth(c.token))).body.code).toBe('PREMIUM_UNPUBLISH_INSTEAD');
  });

  it('unpublish hides it (even with a lapsed plan); republish needs an active plan', async () => {
    const { c, d, post } = await publishedPost();
    await expirePlan(c.id);
    expect((await request(app).post(`/api/posts/premium/${d.id}/unpublish`).set(auth(c.token))).status).toBe(200);
    expect((await request(app).get(`/api/posts/${post.slug}`)).status).toBe(404);
    expect((await request(app).post(`/api/posts/premium/${d.id}/republish`).set(auth(c.token))).status).toBe(403);
  });
});

it('unapproved ordinary posts are not readable by the public', async () => {
  const p = await Post.create({ author: { userId: new mongoose.Types.ObjectId(), name: 'Meenzo', username: 'meenzo' }, content: 'x', topic: 'GS', slug: 'pending-x', approvalStatus: 'rejected' });
  expect((await request(app).get(`/api/posts/${p.slug}`)).status).toBe(404);
  const admin = await makeUser('admin');
  expect((await request(app).get(`/api/posts/${p.slug}`).set(auth(admin.token))).status).toBe(200);
});

describe('AI images', () => {
  function fakeOpenAI(opts: { fail?: boolean } = {}) {
    const calls = { chat: 0, images: 0 };
    setOpenAIForTests({
      chat: { completions: { create: async () => { calls.chat++; return { choices: [{ message: { content: 'A flat illustration of the Indian Constitution book with scales of justice, no text.' } }] }; } } },
      images: { generate: async () => {
        calls.images++;
        if (opts.fail) throw new Error('provider down');
        const b = await sharp({ create: { width: 1536, height: 1024, channels: 3, background: { r: 200, g: 100, b: 50 } } }).png().toBuffer();
        return { data: [{ b64_json: b.toString('base64') }] };
      } },
    } as never);
    return calls;
  }

  it('is disabled with a clear message when not configured', async () => {
    const c = await makeUser('user', 'creator');
    const d = await readyDraft(c.token);
    process.env.AI_IMAGE_ENABLED = 'false';
    const r = await request(app).post(`/api/posts/premium/${d.id}/ai-image`).set(auth(c.token));
    expect(r.status).toBe(503);
    expect(r.body.code).toBe('AI_IMAGE_DISABLED');
  });

  it('generate → preview candidate → accept sets the cover; nothing is attached before accept', async () => {
    const calls = fakeOpenAI();
    const c = await makeUser('user', 'creator');
    const d = await readyDraft(c.token);
    const g = await request(app).post(`/api/posts/premium/${d.id}/ai-image`).set(auth(c.token));
    expect(g.status).toBe(201);
    expect(calls).toEqual({ chat: 1, images: 1 });
    expect((await PremiumPost.findById(d.id))!.draft.coverImage).toBe(d.draft.coverImage);

    const a = await request(app).post(`/api/posts/premium/${d.id}/ai-image/${g.body.candidate.id}/accept`).set(auth(c.token)).send({});
    expect(a.body.post.draft.coverImage).toBe(g.body.candidate.url);
    expect(a.body.post.draft.isAiImage).toBe(true);
  });

  it('discard deletes the stored image', async () => {
    fakeOpenAI();
    const c = await makeUser('user', 'creator');
    const d = await readyDraft(c.token);
    const g = await request(app).post(`/api/posts/premium/${d.id}/ai-image`).set(auth(c.token));
    const before = stored.size;
    await request(app).post(`/api/posts/premium/${d.id}/ai-image/${g.body.candidate.id}/discard`).set(auth(c.token));
    expect(stored.size).toBe(before - 1);
    expect((await request(app).post(`/api/posts/premium/${d.id}/ai-image/${g.body.candidate.id}/accept`).set(auth(c.token))).status).toBe(404);
  });

  it('enforces the daily limit, and provider failures do not use it up', async () => {
    const c = await makeUser('user', 'creator');
    const d = await readyDraft(c.token);
    fakeOpenAI({ fail: true });
    const f = await request(app).post(`/api/posts/premium/${d.id}/ai-image`).set(auth(c.token));
    expect(f.body.code).toBe('AI_IMAGE_FAILED');
    expect((await AiImageUsage.findOne())!.count).toBe(0);

    fakeOpenAI();
    expect((await request(app).post(`/api/posts/premium/${d.id}/ai-image`).set(auth(c.token))).status).toBe(201);
    expect((await request(app).post(`/api/posts/premium/${d.id}/ai-image`).set(auth(c.token))).status).toBe(201);
    const third = await request(app).post(`/api/posts/premium/${d.id}/ai-image`).set(auth(c.token));
    expect(third.status).toBe(429);
    expect(third.body.code).toBe('AI_IMAGE_LIMIT');
  });

  it('concurrent clicks generate one image at a time', async () => {
    fakeOpenAI();
    process.env.AI_IMAGE_DAILY_LIMIT = '5';
    const c = await makeUser('user', 'creator');
    const d = await readyDraft(c.token);
    const rs = await Promise.all(Array.from({ length: 3 }, () => request(app).post(`/api/posts/premium/${d.id}/ai-image`).set(auth(c.token))));
    expect(rs.filter((r) => r.status === 201)).toHaveLength(1);
    expect(rs.filter((r) => r.body.code === 'AI_IMAGE_BUSY')).toHaveLength(2);
  });

  it('unaccepted candidates are cleaned up', async () => {
    fakeOpenAI();
    const c = await makeUser('user', 'creator');
    const d = await readyDraft(c.token);
    await request(app).post(`/api/posts/premium/${d.id}/ai-image`).set(auth(c.token));
    await AiImageCandidate.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    const before = stored.size;
    await cleanupExpiredCandidates();
    expect(stored.size).toBe(before - 1);
    expect((await AiImageCandidate.findOne())!.status).toBe('expired');
  });

  it('non-creators cannot generate', async () => {
    fakeOpenAI();
    const u = await makeUser('user', 'premium');
    const c = await makeUser('user', 'creator');
    const d = await readyDraft(c.token);
    expect((await request(app).post(`/api/posts/premium/${d.id}/ai-image`).set(auth(u.token))).status).toBe(403);
  });
});
