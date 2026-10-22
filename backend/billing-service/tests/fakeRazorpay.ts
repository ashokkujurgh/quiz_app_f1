// In-memory stand-in for the Razorpay REST API. Signature helpers stay real (HMAC with test secrets).
import crypto from 'crypto';
import type { RazorpayPayment } from '../src/services/razorpay';

export const store = {
  orders:   new Map<string, { id: string; amount: number; receipt: string }>(),
  payments: new Map<string, RazorpayPayment>(),
  failNextOrder: false,
  reset() { this.orders.clear(); this.payments.clear(); this.failNextOrder = false; },
};

export const fake = {
  createOrder: jest.fn(async (amount: number, receipt: string) => {
    if (store.failNextOrder) { store.failNextOrder = false; throw new Error('razorpay down'); }
    const id = `order_${crypto.randomBytes(6).toString('hex')}`;
    store.orders.set(id, { id, amount, receipt });
    return { id, amount, currency: 'INR', receipt, status: 'created' };
  }),
  fetchPayment: jest.fn(async (id: string) => {
    const p = store.payments.get(id);
    if (!p) throw new Error('not found');
    return { ...p };
  }),
  fetchOrderPayments: jest.fn(async (orderId: string) =>
    [...store.payments.values()].filter((p) => p.order_id === orderId).map((p) => ({ ...p }))),
  capturePayment: jest.fn(async (id: string) => {
    const p = store.payments.get(id)!;
    p.status = 'captured';
    return { ...p };
  }),
};

/** Simulate the customer paying an order at Razorpay. */
export function payOrder(orderId: string, status: RazorpayPayment['status'] = 'captured', amount?: number): RazorpayPayment {
  const order = store.orders.get(orderId)!;
  const p: RazorpayPayment = {
    id: `pay_${crypto.randomBytes(6).toString('hex')}`, order_id: orderId, amount: amount ?? order.amount,
    currency: 'INR', status, method: 'upi', amount_refunded: 0,
  };
  store.payments.set(p.id, p);
  return p;
}

export function checkoutSignature(orderId: string, paymentId: string): string {
  return crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest('hex');
}

export function webhookSignature(body: string): string {
  return crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!).update(body).digest('hex');
}
