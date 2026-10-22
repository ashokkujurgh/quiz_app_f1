import mongoose, { ClientSession } from 'mongoose';

let supportsTx: boolean | null = null;

/** True when MongoDB runs as a replica set / sharded cluster (multi-document transactions available). */
export async function transactionsSupported(): Promise<boolean> {
  if (supportsTx !== null) return supportsTx;
  try {
    const hello = await mongoose.connection.db!.admin().command({ hello: 1 });
    supportsTx = !!(hello.setName || hello.msg === 'isdbgrid');
  } catch {
    supportsTx = false;
  }
  return supportsTx;
}

/**
 * Run `fn` in a transaction when the server supports it; otherwise run it directly.
 * Callers must stay correct without a transaction (unique indexes + conditional updates);
 * the transaction only removes partial-write windows if the process crashes mid-way.
 */
export async function maybeTransaction<T>(fn: (session: ClientSession | null) => Promise<T>): Promise<T> {
  if (!(await transactionsSupported())) return fn(null);
  const session = await mongoose.startSession();
  try {
    let result: T;
    await session.withTransaction(async () => { result = await fn(session); });
    return result!;
  } finally {
    await session.endSession();
  }
}

export function resetTxCacheForTests(): void { supportsTx = null; }
