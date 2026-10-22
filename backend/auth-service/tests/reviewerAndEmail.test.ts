const sent: { to: string; subject: string; html: string }[] = [];
jest.mock('nodemailer', () => ({ createTransport: () => ({ sendMail: jest.fn(async (m: { to: string; subject: string; html: string }) => { sent.push(m); }) }) }));

import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../src/models/User';
import RoleChangeLog from '../src/models/RoleChangeLog';
import adminRoutes from '../src/routes/admin';
import internalRoutes from '../src/routes/internal';
import { signAccessToken } from '../src/utils/jwt';

process.env.JWT_SECRET = 'test-jwt';
process.env.INTERNAL_SERVICE_SECRET = 'test-internal';
process.env.MAIL_USER = 'info@meenzo.test';
process.env.MAIL_PASSWORD = 'x';

// The two routers under test, mounted exactly as server.ts mounts them
const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);
app.use('/internal', internalRoutes);

let mongo: MongoMemoryServer;
beforeAll(async () => { mongo = await MongoMemoryServer.create(); await mongoose.connect(mongo.getUri()); await User.syncIndexes(); });
afterAll(async () => { await mongoose.disconnect(); await mongo.stop(); });
beforeEach(async () => { await User.deleteMany({}); await RoleChangeLog.deleteMany({}); sent.length = 0; });

async function user(role: 'user' | 'reviewer' | 'admin' = 'user') {
  const u = await User.create({ name: 'Test Person', email: `${new mongoose.Types.ObjectId()}@ex.com`, role, authProvider: 'email' });
  return { id: u._id.toString(), token: signAccessToken({ id: u._id.toString(), email: u.email, role }) };
}

const grant = (token: string, id: string, body: object) => request(app).post(`/api/admin/users/${id}/reviewer`).set('Authorization', `Bearer ${token}`).send(body);

describe('Content Reviewer role', () => {
  it('only admins can grant or revoke it, with a reason, and every change is logged', async () => {
    const admin = await user('admin');
    const u = await user();
    const someone = await user();
    expect((await grant(someone.token, u.id, { grant: true, reason: 'x' })).status).toBe(403);
    expect((await grant(admin.token, u.id, { grant: true })).status).toBe(400);
    expect((await grant(admin.token, u.id, { grant: true, reason: 'Subject expert in polity' })).body.user.role).toBe('reviewer');
    expect((await grant(admin.token, u.id, { grant: false, reason: 'No longer active' })).body.user.role).toBe('user');
    const log = await RoleChangeLog.find().sort({ createdAt: 1 });
    expect(log.map((l) => `${l.fromRole}>${l.toRole}`)).toEqual(['user>reviewer', 'reviewer>user']);
  });

  it('reviewers cannot grant the role, and admins cannot be demoted or self-edited here', async () => {
    const admin = await user('admin');
    const other = await user('admin');
    const reviewer = await user('reviewer');
    const u = await user();
    expect((await grant(reviewer.token, u.id, { grant: true, reason: 'friend' })).status).toBe(403);
    expect((await grant(admin.token, other.id, { grant: false, reason: 'test' })).status).toBe(409);
    expect((await grant(admin.token, admin.id, { grant: false, reason: 'test' })).status).toBe(400);
    expect((await User.findById(other.id))!.role).toBe('admin');
  });

  it('lists reviewers for admins', async () => {
    const admin = await user('admin');
    await user('reviewer');
    const r = await request(app).get('/api/admin/reviewers').set('Authorization', `Bearer ${admin.token}`);
    expect(r.body.reviewers).toHaveLength(1);
  });
});

describe('internal email', () => {
  const send = (body: object, secret = 'test-internal') => request(app).post('/internal/email').set('x-internal-secret', secret).send(body);

  it('needs the shared secret', async () => {
    expect((await send({ template: 'post_approved', toEmail: 'a@b.co' }, 'wrong')).status).toBe(403);
  });

  it('sends to a user id with the template, escaping all data', async () => {
    const u = await user();
    const r = await send({ template: 'post_rejected', toUserId: u.id, data: { title: '<script>x</script>', reason: 'Use <b>sources</b>', dashboardUrl: 'https://meenzo.com/creator' } });
    expect(r.status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0].html).toContain('&lt;script&gt;');
    expect(sent[0].html).not.toContain('<script>');
    expect(sent[0].html).toContain('Use &lt;b&gt;sources&lt;/b&gt;');
  });

  it('reports when mail is not configured or the recipient is unknown', async () => {
    expect((await send({ template: 'post_approved', toUserId: new mongoose.Types.ObjectId().toString(), data: {} })).body.code).toBe('NO_RECIPIENT');
    delete process.env.MAIL_PASSWORD;
    expect((await send({ template: 'post_approved', toEmail: 'a@b.co', data: {} })).body.code).toBe('MAIL_NOT_CONFIGURED');
    process.env.MAIL_PASSWORD = 'x';
    expect((await send({ template: 'nope', toEmail: 'a@b.co' })).status).toBe(400);
  });
});
