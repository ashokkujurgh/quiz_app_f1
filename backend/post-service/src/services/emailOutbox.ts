import axios, { AxiosError } from 'axios';
import { Types } from 'mongoose';
import EmailOutbox, { IEmailOutbox } from '../models/EmailOutbox';

const MAX_ATTEMPTS = 6;

export function siteUrl(path = ''): string {
  return `${(process.env.SITE_URL ?? 'https://meenzo.com').replace(/\/$/, '')}${path}`;
}

/**
 * Queue an email and try to send it right away. `dedupeKey` makes it idempotent (a retried
 * approval never emails twice). Never throws.
 */
export async function queueEmail(template: IEmailOutbox['template'], to: { userId?: string | Types.ObjectId; email?: string }, data: Record<string, unknown>, dedupeKey: string): Promise<void> {
  try {
    const doc = await EmailOutbox.create({
      template, data, dedupeKey,
      toUserId: to.userId ? new Types.ObjectId(String(to.userId)) : null,
      toEmail: to.email ?? null,
    });
    await deliver(doc.toObject());
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) console.error('[email] queue failed:', (err as Error).message);
  }
}

async function deliver(e: IEmailOutbox): Promise<void> {
  const url = process.env.AUTH_SERVICE_URL ?? 'http://auth-service:4001';
  const secret = process.env.INTERNAL_SERVICE_SECRET;
  let error: string | null = null;
  if (!secret) error = 'INTERNAL_SERVICE_SECRET not set';
  else {
    try {
      await axios.post(`${url}/internal/email`, { template: e.template, toUserId: e.toUserId?.toString(), toEmail: e.toEmail, data: e.data },
        { headers: { 'x-internal-secret': secret }, timeout: 15_000 });
    } catch (err) {
      const ax = err as AxiosError<{ code?: string }>;
      error = ax.response?.data?.code ?? ax.message ?? 'send failed';
    }
  }
  const attempts = e.attempts + 1;
  if (!error) {
    await EmailOutbox.updateOne({ _id: e._id }, { $set: { status: 'sent', sentAt: new Date(), lastError: null }, $inc: { attempts: 1 } });
    return;
  }
  const giveUp = attempts >= MAX_ATTEMPTS || error === 'NO_RECIPIENT';
  await EmailOutbox.updateOne({ _id: e._id }, {
    $set: { status: giveUp ? 'failed' : 'pending', lastError: String(error).slice(0, 200), nextAttemptAt: new Date(Date.now() + 2 ** attempts * 60_000) },
    $inc: { attempts: 1 },
  });
  if (giveUp) console.error(`[email] gave up on ${e.template} (${e._id}): ${error}`);
}

/** Background retry of pending emails whose time has come. */
export async function retryPendingEmails(now = new Date()): Promise<number> {
  const due = await EmailOutbox.find({
    status: 'pending', nextAttemptAt: { $lte: now },
    // fresh rows are sent inline; pick them up here only if that never finished
    $or: [{ attempts: { $gt: 0 } }, { createdAt: { $lt: new Date(now.getTime() - 60_000) } }],
  }).limit(50).lean<IEmailOutbox[]>();
  for (const e of due) await deliver(e);
  return due.length;
}
