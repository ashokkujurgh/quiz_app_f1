// Integration harness: quiz-service + the REAL billing-service, both on one in-memory MongoDB
// replica set, plus a stub question-service. Billing has its own mongoose copy (its own node_modules).
import http from 'http';
import { AddressInfo } from 'net';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { io as ioClient, Socket } from 'socket.io-client';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.INTERNAL_SERVICE_SECRET = 'test-internal-secret';
// Storage config is read at import time; uploads are never exercised here
process.env.DO_SPACES_BUCKET   = 'test-bucket';
process.env.DO_SPACES_KEY      = 'test';
process.env.DO_SPACES_SECRET   = 'test';
process.env.DO_SPACES_ENDPOINT = 'https://example.invalid';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const billingMongoose: typeof mongoose = require('../../billing-service/node_modules/mongoose');

let mongo: MongoMemoryReplSet;
let billingServer: http.Server;
let questionStub: http.Server;
let quizServer: http.Server;
export let quizUrl = '';
export let billingUrl = '';

function listen(server: http.Server): Promise<string> {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)));
}

export async function start(): Promise<void> {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' }, instanceOpts: [{ launchTimeout: 60_000 }] });
  const uri = mongo.getUri();

  // Stub question-service: no questions, so a started game session ends quietly
  questionStub = http.createServer((_req, res) => { res.setHeader('Content-Type', 'application/json'); res.end('{"questions":[]}'); });
  process.env.QUESTION_SERVICE_URL = await listen(questionStub);

  await billingMongoose.connect(uri);
  const billingApp = (await import('../../billing-service/src/app')).default;
  const { seedPlans } = await import('../../billing-service/src/models/Plan');
  await Promise.all(Object.values(billingMongoose.models).map((m) => m.syncIndexes()));
  await seedPlans();
  billingServer = http.createServer(billingApp);
  billingUrl = await listen(billingServer);
  process.env.BILLING_SERVICE_URL = billingUrl;

  await mongoose.connect(uri);
  const app = (await import('../src/app')).default;
  const { initGameSocket } = await import('../src/socket/gameController');
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  quizServer = http.createServer(app);
  initGameSocket(quizServer);
  quizUrl = await listen(quizServer);
}

export async function stop(): Promise<void> {
  const { getIO } = await import('../src/socket/gameController');
  await new Promise((r) => getIO()?.close(() => r(null)) ?? r(null));
  for (const srv of [quizServer, billingServer, questionStub]) if (srv) await new Promise((r) => srv.close(r));
  await mongoose.disconnect();
  await billingMongoose.disconnect();
  if (mongo) await mongo.stop();
}

export async function reset(): Promise<void> {
  const cols = await mongoose.connection.db!.collections();
  await Promise.all(cols.filter((c) => c.collectionName !== 'plans').map((c) => c.deleteMany({})));
}

const DAY = 86_400_000;

export async function makeUser(role = 'user', plan: 'free' | 'premium' = 'free'): Promise<{ id: string; token: string }> {
  const id = new mongoose.Types.ObjectId();
  await mongoose.connection.db!.collection('users').insertOne({
    _id: id, name: 'Player', username: `p${id.toString().slice(-8)}`, email: `${id}@ex.com`, role, isActive: true,
  });
  if (plan === 'premium') {
    await mongoose.connection.db!.collection('usersubscriptions').insertOne({
      userId: id, planCode: 'premium', tier: 1, status: 'active', startsAt: new Date(Date.now() - DAY),
      endsAt: new Date(Date.now() + 29 * DAY), source: 'admin_grant', bonusDays: 0, renewalReminders: true,
      paymentId: null, convertedInto: null, statusReason: null, createdAt: new Date(), updatedAt: new Date(),
    });
  }
  const token = jwt.sign({ id: id.toString(), email: 'x@ex.com', role }, process.env.JWT_SECRET!, { issuer: 'meenzo-auth', expiresIn: '1h' });
  return { id: id.toString(), token };
}

/** Connect a game socket, send join_game and resolve with what the server answered. */
export async function joinGame(token: string, quizId: string): Promise<{ socket: Socket; event: 'players_list' | 'game_error'; data: Record<string, unknown> }> {
  const socket = ioClient(quizUrl, { path: '/quiz.io/', auth: { token }, transports: ['websocket'], forceNew: true });
  await new Promise<void>((resolve, reject) => { socket.on('connect', () => resolve()); socket.on('connect_error', reject); });
  return new Promise((resolve) => {
    socket.once('players_list', (data) => resolve({ socket, event: 'players_list', data }));
    socket.once('game_error',   (data) => resolve({ socket, event: 'game_error', data }));
    socket.emit('join_game', { quizId, userName: 'Player' });
  });
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
