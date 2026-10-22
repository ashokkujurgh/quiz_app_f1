import mongoose, { Document, Schema, Types } from 'mongoose';

// Razorpay one-time order for a 30-day pass. Status only moves forward; 'paid' is set
// solely by the server after verifying with Razorpay (signature + API fetch or signed webhook).
export type PaymentStatus =
  | 'created'             // order created, checkout not finished
  | 'pending'             // authorized at Razorpay but not captured yet
  | 'paid'                // captured and the subscription is active
  | 'failed'
  | 'cancelled'           // user closed checkout (can still become paid if Razorpay captures later)
  | 'expired'             // order never paid within the reconciliation window
  | 'refunded'
  | 'partially_refunded';

export interface IPaymentEvent {
  at:     Date;
  type:   string;
  source: 'checkout' | 'verify' | 'webhook' | 'reconcile' | 'admin' | 'client';
  note?:  string;
}

export interface IPayment extends Document {
  _id:               Types.ObjectId;
  userId:            Types.ObjectId;
  planCode:          'premium' | 'creator';
  amountPaise:       number;
  currency:          'INR';
  status:            PaymentStatus;
  idempotencyKey:    string;
  razorpayOrderId:   string | null;
  razorpayPaymentId: string | null;
  refundedPaise:     number;
  method:            string | null;
  failureReason:     string | null;
  subscriptionId:    Types.ObjectId | null;
  paidAt:            Date | null;
  events:            IPaymentEvent[];
  createdAt:         Date;
  updatedAt:         Date;
}

const PaymentEventSchema = new Schema<IPaymentEvent>(
  {
    at:     { type: Date, default: () => new Date() },
    type:   { type: String, required: true },
    source: { type: String, required: true },
    note:   { type: String },
  },
  { _id: false }
);

const PaymentSchema = new Schema<IPayment>(
  {
    userId:            { type: Schema.Types.ObjectId, required: true },
    planCode:          { type: String, required: true, enum: ['premium', 'creator'] },
    amountPaise:       { type: Number, required: true, min: 1, validate: Number.isInteger },
    currency:          { type: String, default: 'INR' },
    status:            { type: String, required: true, default: 'created',
                         enum: ['created', 'pending', 'paid', 'failed', 'cancelled', 'expired', 'refunded', 'partially_refunded'] },
    idempotencyKey:    { type: String, required: true },
    razorpayOrderId:   { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    refundedPaise:     { type: Number, default: 0 },
    method:            { type: String, default: null },
    failureReason:     { type: String, default: null },
    subscriptionId:    { type: Schema.Types.ObjectId, default: null },
    paidAt:            { type: Date, default: null },
    events:            { type: [PaymentEventSchema], default: [] },
  },
  { timestamps: true }
);

PaymentSchema.index({ userId: 1, createdAt: -1 });
PaymentSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
PaymentSchema.index({ razorpayOrderId: 1 }, { unique: true, partialFilterExpression: { razorpayOrderId: { $type: 'string' } } });
PaymentSchema.index({ razorpayPaymentId: 1 }, { unique: true, partialFilterExpression: { razorpayPaymentId: { $type: 'string' } } });
PaymentSchema.index({ status: 1, createdAt: 1 });

export default mongoose.model<IPayment>('Payment', PaymentSchema);
