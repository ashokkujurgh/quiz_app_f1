import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryReplSet, MongoMemoryServer } from 'mongodb-memory-server';
import User from '../src/models/User';
import { seedPlans } from '../src/models/Plan';
import { clearPlanCache } from '../src/services/plans';
import { resetTxCacheForTests } from '../src/services/tx';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'rzp_test_webhook_secret';
process.env.INTERNAL_SERVICE_SECRET = 'test-internal-secret';
process.env.PAYOUT_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');

let server: MongoMemoryReplSet | MongoMemoryServer;

/** replSet=true gives transactions (like a replica-set production DB); false tests the fallback path. */
export async function startDb(replSet = true): Promise<void> {
  server = replSet
    ? await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' }, instanceOpts: [{ launchTimeout: 60_000 }] })
    : await MongoMemoryServer.create({ instance: { launchTimeout: 60_000 } });
  await mongoose.connect(server.getUri());
  resetTxCacheForTests();
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
}

export async function stopDb(): Promise<void> {
  await mongoose.disconnect();
  await server.stop();
}

export async function resetDb(): Promise<void> {
  const cols = await mongoose.connection.db!.collections();
  await Promise.all(cols.map((c) => c.deleteMany({})));
  clearPlanCache();
  await seedPlans();
}

export async function makeUser(role = 'user', name = 'Test User'): Promise<{ id: string; token: string }> {
  const u = await User.create({ name, username: `u${Math.random().toString(36).slice(2, 10)}`, email: `${Math.random().toString(36).slice(2)}@ex.com`, role, isActive: true });
  return { id: u._id.toString(), token: tokenFor(u._id.toString(), role) };
}

export function tokenFor(id: string, role = 'user'): string {
  return jwt.sign({ id, email: 'x@ex.com', role }, process.env.JWT_SECRET!, { issuer: 'meenzo-auth', expiresIn: '1h' });
}
