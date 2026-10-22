import crypto from 'crypto';
import { AppError } from '../utils/errors';

// AES-256-GCM for payout details at rest. Key from PAYOUT_ENCRYPTION_KEY (32 bytes, base64 or hex).
// PAYOUT_ENCRYPTION_KEY_PREVIOUS (optional) is tried for decryption during a key rotation.

export interface SealedBox { v: 1; kid: string; iv: string; tag: string; data: string }

function parseKey(raw: string | undefined): Buffer | null {
  if (!raw) return null;
  const k = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  return k.length === 32 ? k : null;
}

const kidOf = (key: Buffer) => crypto.createHash('sha256').update(key).digest('hex').slice(0, 8);

export function encryptionConfigured(): boolean {
  return !!parseKey(process.env.PAYOUT_ENCRYPTION_KEY);
}

function currentKey(): Buffer {
  const k = parseKey(process.env.PAYOUT_ENCRYPTION_KEY);
  if (!k) throw new AppError(503, 'Withdrawals are not available yet (payout details cannot be stored securely).', 'PAYOUTS_NOT_CONFIGURED');
  return k;
}

export function seal(value: unknown): SealedBox {
  const key = currentKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { v: 1, kid: kidOf(key), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
}

export function open<T = unknown>(box: SealedBox): T {
  const keys = [parseKey(process.env.PAYOUT_ENCRYPTION_KEY), parseKey(process.env.PAYOUT_ENCRYPTION_KEY_PREVIOUS)].filter((k): k is Buffer => !!k);
  const key = keys.find((k) => kidOf(k) === box.kid);
  if (!key) throw new AppError(500, 'Payout details cannot be decrypted with the configured key.', 'PAYOUT_KEY_MISMATCH');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(box.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(box.tag, 'base64'));
  const out = Buffer.concat([decipher.update(Buffer.from(box.data, 'base64')), decipher.final()]);
  return JSON.parse(out.toString('utf8')) as T;
}
