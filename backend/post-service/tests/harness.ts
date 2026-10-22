// post-service + REAL billing-service on one in-memory MongoDB replica set.
import http from 'http';
import { AddressInfo } from 'net';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import sharp from 'sharp';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.INTERNAL_SERVICE_SECRET = 'test-internal-secret';
process.env.DO_SPACES_KEY = 'k'; process.env.DO_SPACES_SECRET = 's'; process.env.DO_SPACES_BUCKET = 'b';
process.env.DO_SPACES_ENDPOINT = 'https://example.invalid'; process.env.DO_SPACES_CDN_URL = 'https://cdn.example.test';
process.env.POST_FILTER_URL = 'http://127.0.0.1:1';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const billingMongoose: typeof mongoose = require('../../billing-service/node_modules/mongoose');

let mongo: MongoMemoryReplSet;
let billingServer: http.Server;
export let billingUrl = '';

function listen(server: http.Server): Promise<string> {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)));
}

export async function start(): Promise<void> {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' }, instanceOpts: [{ launchTimeout: 60_000 }] });
  const uri = mongo.getUri();
  await billingMongoose.connect(uri);
  const billingApp = (await import('../../billing-service/src/app')).default;
  const { seedPlans } = await import('../../billing-service/src/models/Plan');
  await Promise.all(Object.values(billingMongoose.models).map((m) => m.syncIndexes()));
  await seedPlans();
  billingServer = http.createServer(billingApp);
  billingUrl = await listen(billingServer);
  process.env.BILLING_SERVICE_URL = billingUrl;
  await mongoose.connect(uri);
  await import('../src/app');
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
}

export async function stop(): Promise<void> {
  if (billingServer) await new Promise((r) => billingServer.close(r));
  await mongoose.disconnect();
  await billingMongoose.disconnect();
  if (mongo) await mongo.stop();
}

export async function reset(): Promise<void> {
  const cols = await mongoose.connection.db!.collections();
  await Promise.all(cols.filter((c) => c.collectionName !== 'plans').map((c) => c.deleteMany({})));
}

const DAY = 86_400_000;
export const GUIDELINES_VERSION = '2026-10-v1';

export async function makeUser(role = 'user', plan: 'free' | 'premium' | 'creator' = 'free', onboard = plan === 'creator') {
  const id = new mongoose.Types.ObjectId();
  const db = mongoose.connection.db!;
  await db.collection('users').insertOne({ _id: id, name: 'Asha Teacher', username: `u${id.toString().slice(-8)}`, email: `${id}@ex.com`, role, isActive: true, avatar: null });
  if (plan !== 'free') {
    await db.collection('usersubscriptions').insertOne({
      userId: id, planCode: plan, tier: plan === 'premium' ? 1 : 2, status: 'active', startsAt: new Date(Date.now() - DAY),
      endsAt: new Date(Date.now() + 29 * DAY), source: 'admin_grant', bonusDays: 0, renewalReminders: true,
      paymentId: null, convertedInto: null, statusReason: null, createdAt: new Date(), updatedAt: new Date(),
    });
  }
  if (onboard) {
    await db.collection('creatorprofiles').insertOne({ userId: id, displayName: 'Asha Teaches', bio: '', status: 'active', statusReason: null,
      guidelinesVersion: GUIDELINES_VERSION, acceptedGuidelinesAt: new Date(), createdAt: new Date(), updatedAt: new Date() });
  }
  const token = jwt.sign({ id: id.toString(), email: 'x@ex.com', role }, process.env.JWT_SECRET!, { issuer: 'meenzo-auth', expiresIn: '1h' });
  return { id: id.toString(), token };
}

export async function expirePlan(userId: string): Promise<void> {
  await mongoose.connection.db!.collection('usersubscriptions').updateMany({ userId: new mongoose.Types.ObjectId(userId) }, { $set: { endsAt: new Date(Date.now() - 1000) } });
}

export async function png(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 30, g: 120, b: 200 } } }).png().toBuffer();
}

export const LONG_TEXT = '<p>' + Array.from({ length: 180 }, (_, i) => `word${i}`).join(' ') + '</p>';

// ── Stub auth-service /internal/email: records what would be emailed ───────────
export const mailbox: { template: string; toUserId?: string; toEmail?: string; data: Record<string, unknown> }[] = [];
export const mailControl = { fail: false };
let authStub: http.Server | null = null;

export async function startAuthStub(): Promise<void> {
  authStub = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      if (req.headers['x-internal-secret'] !== process.env.INTERNAL_SERVICE_SECRET) { res.statusCode = 403; res.end('{}'); return; }
      if (mailControl.fail) { res.statusCode = 503; res.end('{"success":false,"code":"MAIL_NOT_CONFIGURED"}'); return; }
      mailbox.push(JSON.parse(body));
      res.end('{"success":true}');
    });
  });
  process.env.AUTH_SERVICE_URL = await listen(authStub);
}

export async function stopAuthStub(): Promise<void> {
  if (authStub) await new Promise((r) => authStub!.close(r));
}

export async function setRole(userId: string, role: string): Promise<void> {
  await mongoose.connection.db!.collection('users').updateOne({ _id: new mongoose.Types.ObjectId(userId) }, { $set: { role } });
}
