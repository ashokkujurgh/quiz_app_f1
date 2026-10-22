import crypto from 'crypto';
import BillingLock from '../models/BillingLock';

const LOCK_TTL_MS = 15_000;
const WAIT_MS     = 50;
const MAX_WAIT_MS = 10_000;

/** Run `fn` while holding a short lock on `key`. Expired locks (crashed holder) are taken over. */
export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const owner = crypto.randomUUID();
  const started = Date.now();

  for (;;) {
    const now = new Date();
    try {
      await BillingLock.findOneAndUpdate(
        { _id: key, lockedUntil: { $lt: now } },
        { $set: { owner, lockedUntil: new Date(now.getTime() + LOCK_TTL_MS) } },
        { upsert: true }
      );
      break; // acquired (either took over an expired lock or inserted a new one)
    } catch (err) {
      // E11000: someone else holds a live lock on this key
      if ((err as { code?: number }).code !== 11000) throw err;
      if (Date.now() - started > MAX_WAIT_MS) throw new Error(`Timed out waiting for lock ${key}`);
      await new Promise((r) => setTimeout(r, WAIT_MS));
    }
  }

  try {
    return await fn();
  } finally {
    await BillingLock.deleteOne({ _id: key, owner }).catch(() => undefined);
  }
}
