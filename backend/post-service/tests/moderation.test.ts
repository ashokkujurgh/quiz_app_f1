const stored = new Map<string, Buffer>();
jest.mock('../src/config/spaces', () => ({
  isStorageConfigured: () => true,
  putPublicObject: jest.fn(async (key: string, body: Buffer) => { stored.set(key, body); return `https://cdn.example.test/${key}`; }),
  deleteObject: jest.fn(async (key: string) => { stored.delete(key); }),
}));

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import Post from '../src/models/Post';
import PremiumPost from '../src/models/PremiumPost';
import PremiumPostRevision from '../src/models/PremiumPostRevision';
import ValidationResult from '../src/models/ValidationResult';
import ReviewAction from '../src/models/ReviewAction';
import EmailOutbox from '../src/models/EmailOutbox';
import { Violation, CreatorRestriction } from '../src/models/Violation';
import { setScreeningClientForTests, parseScreeningOutput } from '../src/services/screening';
import { retryPendingEmails } from '../src/services/emailOutbox';
import { sweepModeration } from '../src/services/moderation';
import { start, stop, reset, makeUser, png, LONG_TEXT, startAuthStub, stopAuthStub, mailbox, mailControl, setRole, billingUrl } from './harness';

beforeAll(async () => { await start(); await startAuthStub(); });
afterAll(async () => { await stopAuthStub(); await stop(); });
beforeEach(async () => {
  await reset(); stored.clear(); mailbox.length = 0; mailControl.fail = false;
  process.env.OPENAI_API_KEY = 'sk-test'; process.env.SITE_URL = 'https://meenzo.test';
  delete process.env.PREMIUM_SCREENING_ENABLED;
  fakeLLM('good');
});

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
const DAY = 86_400_000;

const GOOD = { relevant: true, quality_score: 82, reasons: ['Clear and accurate'], recommended_action: 'approve',
  flags: { title_ok: true, length_ok: true, spam_or_stuffing: false, misleading_or_unsafe: false, likely_copied: false, promotional: false, suspicious_links: false, view_manipulation: false, image_relevant: true } };

function fakeLLM(mode: 'good' | 'malformed' | 'invalid' | 'error' | 'timeout') {
  setScreeningClientForTests({ chat: { completions: { create: async () => {
    if (mode === 'error') throw new Error('500 provider error');
    if (mode === 'timeout') { const e = new Error('Request timed out.'); e.name = 'APIConnectionTimeoutError'; throw e; }
    const content = mode === 'malformed' ? 'not json {' : JSON.stringify(mode === 'invalid' ? { ...GOOD, quality_score: 140 } : GOOD);
    return { choices: [{ message: { content } }] };
  } } } } as never);
}

async function submitPost(creatorToken: string, body: Record<string, unknown> = {}) {
  const up = await request(app).post('/api/posts/premium/upload').set(auth(creatorToken)).attach('image', await png(1200, 630), 'c.png');
  const d = await request(app).post('/api/posts/premium').set(auth(creatorToken)).send({
    title: 'Indian Polity: Fundamental Rights explained', content: LONG_TEXT, topic: 'General Studies', tags: ['polity'], coverImage: up.body.image.url, ...body,
  });
  const s = await request(app).post(`/api/posts/premium/${d.body.post.id}/submit`).set(auth(creatorToken));
  const rev = await PremiumPostRevision.findOne({ premiumPostId: d.body.post.id }).sort({ version: -1 });
  return { premiumId: d.body.post.id as string, revisionId: rev?._id.toString() ?? '', submit: s };
}

async function setup() {
  const reviewer = await makeUser('reviewer');
  const creator = await makeUser('user', 'creator');
  return { reviewer, creator };
}

const approve = (t: string, id: string) => request(app).post(`/api/moderation/${id}/approve`).set(auth(t)).send({});
const reject = (t: string, id: string, body: object) => request(app).post(`/api/moderation/${id}/reject`).set(auth(t)).send(body);

describe('submission pipeline', () => {
  it('submit → screened → assigned to a reviewer → reviewer emailed; nothing public', async () => {
    const { reviewer, creator } = await setup();
    const { revisionId } = await submitPost(creator.token);
    const rev = await PremiumPostRevision.findById(revisionId);
    expect(rev!.assignedReviewerId!.toString()).toBe(reviewer.id);
    const v = await ValidationResult.findOne({ revisionId });
    expect(v!.status).toBe('completed');
    expect(v!.output).toMatchObject({ relevant: true, quality_score: 82, recommended_action: 'approve' });
    expect(mailbox).toEqual([expect.objectContaining({ template: 'reviewer_assigned', toUserId: reviewer.id })]);
    expect(String(mailbox[0].data.reviewUrl)).toBe(`https://meenzo.test/review/${revisionId}`);
    expect(await Post.countDocuments()).toBe(0);

    const q = await request(app).get('/api/moderation/queue').set(auth(reviewer.token));
    expect(q.body.items).toHaveLength(1);
    expect(q.body.items[0].screening.recommended).toBe('approve');
  });

  it.each([
    ['malformed', 'error', 'malformed_output'],
    ['invalid', 'error', 'malformed_output'],
    ['error', 'error', 'provider_error'],
    ['timeout', 'error', 'timeout'],
  ] as const)('LLM %s → stored as %s (%s) and still goes to a human', async (mode, status, code) => {
    fakeLLM(mode);
    const { reviewer, creator } = await setup();
    const { revisionId } = await submitPost(creator.token);
    const v = await ValidationResult.findOne({ revisionId });
    expect([v!.status, v!.errorCode, v!.output]).toEqual([status, code, null]);
    expect((await PremiumPostRevision.findById(revisionId))!.assignedReviewerId!.toString()).toBe(reviewer.id);
  });

  it('LLM not configured → skipped, still queued', async () => {
    delete process.env.OPENAI_API_KEY;
    const { creator } = await setup();
    const { revisionId } = await submitPost(creator.token);
    expect((await ValidationResult.findOne({ revisionId }))!.status).toBe('skipped');
  });

  it('server-side validation rejects out-of-range or missing fields', () => {
    expect(parseScreeningOutput(GOOD)).not.toBeNull();
    expect(parseScreeningOutput({ ...GOOD, recommended_action: 'publish' })).toBeNull();
    expect(parseScreeningOutput({ ...GOOD, flags: { ...GOOD.flags, promotional: 'yes' } })).toBeNull();
    expect(parseScreeningOutput({ ...GOOD, reasons: 'fine' })).toBeNull();
  });

  it('deterministic checks flag promotion, stuffing and shortened links', async () => {
    const { creator } = await setup();
    const spam = '<p>' + Array.from({ length: 160 }, () => 'upsc').join(' ') + ' Call 9876543210 on WhatsApp, join my channel <a href="https://bit.ly/x">here</a></p>';
    const { revisionId } = await submitPost(creator.token, { content: spam });
    const v = await ValidationResult.findOne({ revisionId });
    expect(v!.heuristics.flags).toEqual(expect.arrayContaining(['keyword_stuffing', 'promotional', 'suspicious_links']));
  });

  it('with no reviewers, an admin is assigned', async () => {
    const admin = await makeUser('admin');
    const creator = await makeUser('user', 'creator');
    const { revisionId } = await submitPost(creator.token);
    expect((await PremiumPostRevision.findById(revisionId))!.assignedReviewerId!.toString()).toBe(admin.id);
  });

  it('with no staff at all, it stays queued and the fallback address is emailed', async () => {
    process.env.PREMIUM_REVIEW_EMAIL_FALLBACK = 'reviews@meenzo.test';
    const creator = await makeUser('user', 'creator');
    const { revisionId } = await submitPost(creator.token);
    delete process.env.PREMIUM_REVIEW_EMAIL_FALLBACK;
    expect((await PremiumPostRevision.findById(revisionId))!.assignedReviewerId).toBeNull();
    expect(mailbox).toEqual([expect.objectContaining({ template: 'reviewer_assigned', toEmail: 'reviews@meenzo.test' })]);
  });

  it('the sweeper finishes a submission whose processing was interrupted', async () => {
    const { reviewer, creator } = await setup();
    const { revisionId } = await submitPost(creator.token);
    await PremiumPostRevision.updateOne({ _id: revisionId }, { $set: { assignedReviewerId: null, submittedAt: new Date(Date.now() - 10 * 60_000) } });
    await sweepModeration();
    expect((await PremiumPostRevision.findById(revisionId))!.assignedReviewerId!.toString()).toBe(reviewer.id);
  });
});

describe('access control', () => {
  it('ordinary users and creators cannot use moderation', async () => {
    const { creator } = await setup();
    const { revisionId } = await submitPost(creator.token);
    expect((await request(app).get('/api/moderation/queue').set(auth(creator.token))).status).toBe(403);
    expect((await approve(creator.token, revisionId)).status).toBe(403);
  });

  it('a revoked reviewer loses access immediately (role read from the database)', async () => {
    const { reviewer } = await setup();
    await setRole(reviewer.id, 'user');
    expect((await request(app).get('/api/moderation/queue').set(auth(reviewer.token))).status).toBe(403);
  });

  it('a user forging role=reviewer in a token gets nothing', async () => {
    const u = await makeUser('user');
    const jwt = (await import('jsonwebtoken')).default;
    const forged = jwt.sign({ id: u.id, email: 'x', role: 'reviewer' }, process.env.JWT_SECRET!, { issuer: 'meenzo-auth' });
    expect((await request(app).get('/api/moderation/queue').set(auth(forged))).status).toBe(403);
  });

  it('nobody approves their own post, and creators are never assigned their own post', async () => {
    const both = await makeUser('reviewer', 'creator', true);
    const other = await makeUser('reviewer');
    const { revisionId } = await submitPost(both.token);
    expect((await PremiumPostRevision.findById(revisionId))!.assignedReviewerId!.toString()).toBe(other.id);
    const r = await approve(both.token, revisionId);
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('SELF_REVIEW');
  });

  it('reviewers cannot touch prices, payments or creator accounts in billing', async () => {
    const { reviewer } = await setup();
    for (const path of ['/api/billing/admin/payments', '/api/billing/admin/subscriptions', '/api/billing/admin/creators']) {
      expect((await request(billingUrl).get(path).set(auth(reviewer.token))).status).toBe(403);
    }
  });
});

describe('decisions', () => {
  it('approve publishes from the frozen revision, emails the creator, logs it', async () => {
    const { reviewer, creator } = await setup();
    const { premiumId, revisionId } = await submitPost(creator.token);
    const r = await approve(reviewer.token, revisionId);
    expect(r.status).toBe(200);
    const post = await Post.findOne({ isPremium: true });
    expect(post!.approvalStatus).toBe('approved');
    expect(post!.title).toBe('Indian Polity: Fundamental Rights explained');
    expect(post!.premium!.tags).toEqual(['polity']);
    const pub = await request(app).get(`/api/posts/${post!.slug}`);
    expect(pub.status).toBe(200);
    expect(JSON.stringify(pub.body)).not.toMatch(/decisionReason|screening|quality_score|reviewer/i);
    expect((await request(app).get('/api/posts')).body.posts).toHaveLength(1);
    expect((await PremiumPost.findById(premiumId))!.status).toBe('published');
    expect(mailbox.map((m) => m.template)).toEqual(['reviewer_assigned', 'post_approved']);
    expect(await ReviewAction.countDocuments({ action: 'approved', actorId: new mongoose.Types.ObjectId(reviewer.id) })).toBe(1);
  });

  it('reject keeps it unpublished, needs a reason, and the creator gets the feedback', async () => {
    const { reviewer, creator } = await setup();
    const { premiumId, revisionId } = await submitPost(creator.token);
    expect((await reject(reviewer.token, revisionId, { reason: 'short' })).status).toBe(400);
    expect((await reject(reviewer.token, revisionId, { reason: 'Please cite sources for the article 21 section.', note: 'internal: looks rushed' })).status).toBe(200);
    expect(await Post.countDocuments()).toBe(0);
    const own = await request(app).get(`/api/posts/premium/${premiumId}`).set(auth(creator.token));
    expect(own.body.post.displayStatus).toBe('rejected');
    expect(own.body.revisions[0].decisionReason).toBe('Please cite sources for the article 21 section.');
    expect(JSON.stringify(own.body)).not.toMatch(/internal: looks rushed|quality_score/);
    const mail = mailbox.find((m) => m.template === 'post_rejected')!;
    expect(mail.data.reason).toBe('Please cite sources for the article 21 section.');
    expect(mail.data.violationNotice).toBeNull();
    expect(await Violation.countDocuments()).toBe(0);
  });

  it('approve and reject at the same moment: exactly one wins', async () => {
    const { reviewer, creator } = await setup();
    const other = await makeUser('reviewer');
    const { revisionId } = await submitPost(creator.token);
    const rs = await Promise.all([approve(reviewer.token, revisionId), reject(other.token, revisionId, { reason: 'Not relevant to exams at all.' })]);
    expect(rs.filter((r) => r.status === 200)).toHaveLength(1);
    expect(rs.filter((r) => r.body.code === 'ALREADY_DECIDED')).toHaveLength(1);
  });

  it('edits to a live post are reviewed while the approved version stays live', async () => {
    const { reviewer, creator } = await setup();
    const { premiumId, revisionId } = await submitPost(creator.token);
    await approve(reviewer.token, revisionId);
    const slug = (await Post.findOne())!.slug;

    await request(app).patch(`/api/posts/premium/${premiumId}`).set(auth(creator.token)).send({ title: 'Fundamental Rights — updated edition' });
    await request(app).post(`/api/posts/premium/${premiumId}/submit`).set(auth(creator.token));
    expect((await request(app).get(`/api/posts/${slug}`)).body.post.title).toBe('Indian Polity: Fundamental Rights explained');
    const v2 = (await PremiumPostRevision.findOne({ version: 2 }))!;
    await reject(reviewer.token, v2.id, { reason: 'Title change is misleading here.' });
    expect((await request(app).get(`/api/posts/${slug}`)).body.post.title).toBe('Indian Polity: Fundamental Rights explained');
    expect((await request(app).get(`/api/posts/premium/${premiumId}`).set(auth(creator.token))).body.post.displayStatus).toBe('published_edit_rejected');

    await request(app).patch(`/api/posts/premium/${premiumId}`).set(auth(creator.token)).send({ title: 'Fundamental Rights: the complete guide' });
    await request(app).post(`/api/posts/premium/${premiumId}/submit`).set(auth(creator.token));
    const v3 = (await PremiumPostRevision.findOne({ version: 3 }))!;
    await approve(reviewer.token, v3.id);
    const live = await request(app).get(`/api/posts/${slug}`);
    expect(live.body.post.title).toBe('Fundamental Rights: the complete guide');
    expect(await Post.countDocuments()).toBe(1);
    expect((await PremiumPostRevision.findOne({ version: 1 }))!.status).toBe('superseded');
  });

  it('reviewer detail shows screening, creator history and the audit trail', async () => {
    const { reviewer, creator } = await setup();
    const { revisionId } = await submitPost(creator.token);
    await request(app).post(`/api/moderation/${revisionId}/notes`).set(auth(reviewer.token)).send({ note: 'Checking facts' });
    const d = await request(app).get(`/api/moderation/${revisionId}`).set(auth(reviewer.token));
    expect(d.body.screening.output.quality_score).toBe(82);
    expect(d.body.creator.confirmedViolations).toBe(0);
    expect(d.body.history.map((h: { action: string }) => h.action)).toEqual(['submitted', 'screened', 'assigned', 'note']);
  });
});

describe('violations', () => {
  async function rejectWithViolation(reviewerToken: string, creatorToken: string, title: string) {
    const { revisionId } = await submitPost(creatorToken, { title });
    return reject(reviewerToken, revisionId, { reason: 'Promotional content with phone numbers.', violation: true, violationCategory: 'promotional' });
  }

  it('1st = Warning 1, 2nd = Warning 2, 3rd = 30-day block enforced by the backend', async () => {
    const { reviewer, creator } = await setup();
    const r1 = await rejectWithViolation(reviewer.token, creator.token, 'First post title for testing');
    const r2 = await rejectWithViolation(reviewer.token, creator.token, 'Second post title for testing');
    const r3 = await rejectWithViolation(reviewer.token, creator.token, 'Third post title for testing');
    expect([r1, r2, r3].map((r) => r.body.result.violation.consequence)).toEqual(['warning_1', 'warning_2', 'restriction_30d']);
    expect(mailbox.filter((m) => m.template === 'post_rejected').map((m) => String(m.data.violationNotice).slice(0, 60)))
      .toEqual([expect.stringContaining('Warning 1'), expect.stringContaining('Warning 2'), expect.stringContaining('third or later')]);

    const blocked = await submitPost(creator.token, { title: 'Fourth post during the block' });
    expect(blocked.submit.status).toBe(403);
    expect(blocked.submit.body.code).toBe('CREATOR_RESTRICTED');
    const until = new Date(blocked.submit.body.restrictedUntil).getTime();
    expect(Math.abs(until - (Date.now() + 30 * DAY))).toBeLessThan(60_000);

    const st = await request(app).get('/api/posts/premium/standing').set(auth(creator.token));
    expect(st.body.standing).toMatchObject({ confirmedViolations: 3, restriction: { active: true } });
    expect(JSON.stringify(st.body)).not.toMatch(/confirmedBy/);
  });

  it('rejections without a confirmed violation, and screening problems, never count', async () => {
    fakeLLM('error');
    const { reviewer, creator } = await setup();
    for (const t of ['Post one for this test', 'Post two for this test', 'Post three for this test']) {
      const { revisionId } = await submitPost(creator.token, { title: t });
      await reject(reviewer.token, revisionId, { reason: 'Needs more depth and examples.' });
    }
    expect(await Violation.countDocuments()).toBe(0);
    expect((await submitPost(creator.token, { title: 'Post four still allowed' })).submit.status).toBe(201);
  });

  it('two simultaneous confirmations get different sequence numbers', async () => {
    const { reviewer, creator } = await setup();
    const other = await makeUser('reviewer');
    const a = await submitPost(creator.token, { title: 'Concurrent violation A' });
    const b = await submitPost(creator.token, { title: 'Concurrent violation B' });
    await Promise.all([
      reject(reviewer.token, a.revisionId, { reason: 'Spam content detected here.', violation: true, violationCategory: 'spam' }),
      reject(other.token, b.revisionId, { reason: 'Spam content detected here.', violation: true, violationCategory: 'spam' }),
    ]);
    expect((await Violation.find().sort({ sequence: 1 })).map((v) => v.sequence)).toEqual([1, 2]);
  });

  it('appeal → admin overturns → block lifted, count drops, record kept and logged', async () => {
    const { reviewer, creator } = await setup();
    const admin = await makeUser('admin');
    for (const t of ['Violation one title here', 'Violation two title here', 'Violation three title here']) await rejectWithViolation(reviewer.token, creator.token, t);
    const third = (await Violation.findOne({ sequence: 3 }))!;

    const ap = await request(app).post(`/api/posts/premium/violations/${third.id}/appeal`).set(auth(creator.token)).send({ text: 'There was no phone number; it was an exam helpline cited from the official notice.' });
    expect(ap.status).toBe(201);
    expect((await request(app).post(`/api/posts/premium/violations/${third.id}/appeal`).set(auth(creator.token)).send({ text: 'Appealing a second time to try my luck.' })).status).toBe(409);
    // The reviewer who confirmed it cannot decide the appeal
    expect((await request(app).post(`/api/moderation/violations/${third.id}/appeal-decision`).set(auth(reviewer.token)).send({ decision: 'overturn', note: 'my bad' })).status).toBe(403);

    const d = await request(app).post(`/api/moderation/violations/${third.id}/appeal-decision`).set(auth(admin.token)).send({ decision: 'overturn', note: 'Official helpline, allowed.' });
    expect(d.status).toBe(200);
    expect((await CreatorRestriction.findOne())!.status).toBe('lifted');
    expect((await Violation.findById(third.id))!.status).toBe('overturned');
    const st = await request(app).get('/api/posts/premium/standing').set(auth(creator.token));
    expect(st.body.standing).toMatchObject({ confirmedViolations: 2, restriction: { active: false } });
    expect((await submitPost(creator.token, { title: 'Allowed again after appeal' })).submit.status).toBe(201);
    expect(await ReviewAction.countDocuments({ action: 'appeal_overturned' })).toBe(1);
    expect(mailbox.some((m) => m.template === 'violation_updated')).toBe(true);
  });

  it('overturning an earlier block moves a stacked later block up', async () => {
    const { reviewer, creator } = await setup();
    const admin = await makeUser('admin');
    for (const t of ['Stack one title here', 'Stack two title here', 'Stack three title here', 'Stack four title here']) {
      // fourth must be submitted during the block: lift it temporarily by inserting directly
      if (t.startsWith('Stack four')) await CreatorRestriction.updateMany({}, { $set: { status: 'lifted' } });
      await rejectWithViolation(reviewer.token, creator.token, t);
      if (t.startsWith('Stack four')) await CreatorRestriction.updateMany({ violationId: (await Violation.findOne({ sequence: 3 }))!._id }, { $set: { status: 'active' } });
    }
    const r4 = (await CreatorRestriction.findOne({ violationId: (await Violation.findOne({ sequence: 4 }))!._id }))!;
    expect(r4.endsAt.getTime() - Date.now()).toBeGreaterThan(55 * DAY);
    await request(app).post(`/api/moderation/violations/${(await Violation.findOne({ sequence: 3 }))!.id}/overturn`).set(auth(admin.token)).send({ reason: 'Mistake by reviewer.' });
    const moved = (await CreatorRestriction.findById(r4._id))!;
    expect(Math.abs(moved.endsAt.getTime() - (Date.now() + 30 * DAY))).toBeLessThan(60_000);
  });
});

describe('emails', () => {
  it('a mail outage never blocks a decision; emails are retried and sent once', async () => {
    const { reviewer, creator } = await setup();
    mailControl.fail = true;
    const { revisionId } = await submitPost(creator.token);
    expect((await approve(reviewer.token, revisionId)).status).toBe(200);
    expect(await EmailOutbox.countDocuments({ status: 'pending' })).toBe(2);
    mailControl.fail = false;
    await EmailOutbox.updateMany({}, { $set: { nextAttemptAt: new Date(Date.now() - 1000) } });
    await retryPendingEmails();
    expect(mailbox.map((m) => m.template).sort()).toEqual(['post_approved', 'reviewer_assigned']);
    await retryPendingEmails();
    expect(mailbox).toHaveLength(2);
  });
});
