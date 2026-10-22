import mongoose, { Document, Schema } from 'mongoose';

// Every Razorpay webhook delivery, keyed by Razorpay's event id, so a re-delivered
// event is recognised and skipped. Only ids are stored — never card/contact details.
export interface IWebhookEvent extends Document {
  eventId:     string;
  provider:    'razorpay';
  event:       string;
  status:      'processing' | 'processed' | 'failed' | 'ignored';
  attempts:    number;
  orderId:     string | null;
  paymentId:   string | null;
  refundId:    string | null;
  error:       string | null;
  processedAt: Date | null;
  createdAt:   Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    eventId:     { type: String, required: true, unique: true },
    provider:    { type: String, default: 'razorpay' },
    event:       { type: String, required: true },
    status:      { type: String, enum: ['processing', 'processed', 'failed', 'ignored'], default: 'processing' },
    attempts:    { type: Number, default: 1 },
    orderId:     { type: String, default: null },
    paymentId:   { type: String, default: null },
    refundId:    { type: String, default: null },
    error:       { type: String, default: null },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);
