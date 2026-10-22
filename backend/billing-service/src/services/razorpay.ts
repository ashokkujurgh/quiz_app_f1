import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

// Thin Razorpay REST client (Orders API, one-time payments). Keys come only from env.

export interface RazorpayOrder {
  id: string; amount: number; currency: string; receipt: string; status: string;
}

export interface RazorpayPayment {
  id:               string;
  order_id:         string;
  amount:           number;
  currency:         string;
  status:           'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  method?:          string;
  amount_refunded?: number;
  error_description?: string | null;
}

export function isConfigured(): boolean {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function isWebhookConfigured(): boolean {
  return !!process.env.RAZORPAY_WEBHOOK_SECRET;
}

export function publicKeyId(): string {
  return process.env.RAZORPAY_KEY_ID ?? '';
}

function client(): AxiosInstance {
  return axios.create({
    baseURL: process.env.RAZORPAY_API_URL ?? 'https://api.razorpay.com/v1',
    auth:    { username: process.env.RAZORPAY_KEY_ID!, password: process.env.RAZORPAY_KEY_SECRET! },
    timeout: 15_000,
  });
}

export async function createOrder(amountPaise: number, receipt: string, notes: Record<string, string>): Promise<RazorpayOrder> {
  const { data } = await client().post('/orders', { amount: amountPaise, currency: 'INR', receipt, notes });
  return data as RazorpayOrder;
}

export async function fetchPayment(paymentId: string): Promise<RazorpayPayment> {
  const { data } = await client().get(`/payments/${encodeURIComponent(paymentId)}`);
  return data as RazorpayPayment;
}

export async function fetchOrderPayments(orderId: string): Promise<RazorpayPayment[]> {
  const { data } = await client().get(`/orders/${encodeURIComponent(orderId)}/payments`);
  return (data?.items ?? []) as RazorpayPayment[];
}

export async function capturePayment(paymentId: string, amountPaise: number): Promise<RazorpayPayment> {
  const { data } = await client().post(`/payments/${encodeURIComponent(paymentId)}/capture`, { amount: amountPaise, currency: 'INR' });
  return data as RazorpayPayment;
}

function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/** Checkout handler signature: HMAC-SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!isConfigured() || !signature) return false;
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC-SHA256(raw request body, webhook secret). */
export function verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
  if (!isWebhookConfigured() || !signature) return false;
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!).update(rawBody).digest('hex');
  return safeEqualHex(expected, signature);
}
