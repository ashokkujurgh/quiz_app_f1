import { AppError } from '../utils/errors';
import { PayoutType } from '../models/PayoutMethod';

// Validation and masking of payout details. Full values never leave this module except
// sealed (encrypted) or to an admin's audited secure view.

export interface BankDetails { holderName: string; accountNumber: string; ifsc: string; bankName: string }
export interface UpiDetails { upiId: string; name: string }
export interface GiftCardDetails { marketplace: 'amazon.in'; deliveryEmail: string }
export type PayoutDetails = BankDetails | UpiDetails | GiftCardDetails;

const name = (v: unknown, field: string) => {
  const s = String(v ?? '').trim().replace(/\s+/g, ' ');
  if (s.length < 2 || s.length > 100 || !/^[\p{L} .'-]+$/u.test(s)) throw new AppError(400, `Enter a valid ${field}.`);
  return s;
};

export function validateDetails(type: unknown, raw: unknown): { type: PayoutType; details: PayoutDetails } {
  const d = (raw ?? {}) as Record<string, unknown>;
  if (type === 'bank') {
    const accountNumber = String(d.accountNumber ?? '').replace(/\s/g, '');
    if (!/^\d{9,18}$/.test(accountNumber)) throw new AppError(400, 'Account number must be 9–18 digits.');
    const ifsc = String(d.ifsc ?? '').trim().toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) throw new AppError(400, 'Enter a valid IFSC code (e.g. SBIN0001234).');
    return { type, details: { holderName: name(d.holderName, 'account holder name'), accountNumber, ifsc, bankName: name(d.bankName, 'bank name') } };
  }
  if (type === 'upi') {
    const upiId = String(d.upiId ?? '').trim().toLowerCase();
    if (!/^[a-z0-9._-]{2,256}@[a-z][a-z0-9]{1,63}$/.test(upiId)) throw new AppError(400, 'Enter a valid UPI ID (e.g. name@okaxis).');
    return { type, details: { upiId, name: name(d.name, 'name on the UPI account') } };
  }
  if (type === 'amazon_gift_card') {
    if ((d.marketplace ?? 'amazon.in') !== 'amazon.in') throw new AppError(400, 'Amazon gift cards are sent for amazon.in only.');
    const deliveryEmail = String(d.deliveryEmail ?? '').trim().toLowerCase();
    if (!/^[^\s@]{1,64}@[^\s@]{1,255}\.[a-z]{2,}$/.test(deliveryEmail)) throw new AppError(400, 'Enter a valid delivery email.');
    return { type, details: { marketplace: 'amazon.in', deliveryEmail } };
  }
  throw new AppError(400, 'Payout method must be bank, upi or amazon_gift_card.');
}

const tail = (s: string, n = 4) => `${'•'.repeat(Math.max(0, Math.min(8, s.length - n)))}${s.slice(-n)}`;
const maskEmailLike = (s: string) => {
  const [user, domain] = s.split('@');
  return `${user.slice(0, 2)}${'•'.repeat(Math.max(1, Math.min(6, user.length - 2)))}@${domain}`;
};

export function mask(type: PayoutType, d: PayoutDetails): Record<string, string> {
  if (type === 'bank') {
    const b = d as BankDetails;
    return { holderName: b.holderName, bankName: b.bankName, ifsc: b.ifsc, accountNumber: tail(b.accountNumber) };
  }
  if (type === 'upi') {
    const u = d as UpiDetails;
    return { upiId: maskEmailLike(u.upiId), name: u.name };
  }
  const g = d as GiftCardDetails;
  return { marketplace: g.marketplace, deliveryEmail: maskEmailLike(g.deliveryEmail) };
}

export function labelFor(type: PayoutType, m: Record<string, string>): string {
  if (type === 'bank') return `${m.bankName} ${m.accountNumber}`;
  if (type === 'upi') return `UPI ${m.upiId}`;
  return `Amazon.in gift card to ${m.deliveryEmail}`;
}
