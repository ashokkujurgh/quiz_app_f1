import mongoose, { ClientSession } from 'mongoose';

let supportsTx: boolean | null = null;

/** True when MongoDB runs as a replica set (multi-document transactions available). */
export async function transactionsSupported(): Promise<boolean> {
  if (supportsTx !== null) return supportsTx;
  try {
    const hello = await mongoose.connection.db!.admin().command({ hello: 1 });
    supportsTx = !!(hello.setName || hello.msg === 'isdbgrid');
  } catch { supportsTx = false; }
  return supportsTx;
}

/** Run in a transaction when supported; callers stay correct without one (conditional updates + sweeper). */
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

export const opts = (session: ClientSession | null) => ({ session: session ?? undefined });
