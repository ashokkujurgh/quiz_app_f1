import mongoose, { Schema, Model, Document, Types } from 'mongoose';

// Emails waiting to be sent through auth-service's mailer. Retried with backoff, so a mail
// outage never blocks or loses a review decision.
export interface IEmailOutbox extends Document {
  _id:           Types.ObjectId;
  template:      'reviewer_assigned' | 'post_approved' | 'post_rejected' | 'violation_updated';
  toUserId:      Types.ObjectId | null;
  toEmail:       string | null;
  data:          Record<string, unknown>;
  dedupeKey:     string;
  status:        'pending' | 'sent' | 'failed';
  attempts:      number;
  lastError:     string | null;
  nextAttemptAt: Date;
  sentAt:        Date | null;
  createdAt:     Date;
}

const EmailOutboxSchema = new Schema<IEmailOutbox>(
  {
    template:      { type: String, required: true },
    toUserId:      { type: Schema.Types.ObjectId, default: null },
    toEmail:       { type: String, default: null },
    data:          { type: Schema.Types.Mixed, default: {} },
    dedupeKey:     { type: String, required: true, unique: true },
    status:        { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    attempts:      { type: Number, default: 0 },
    lastError:     { type: String, default: null },
    nextAttemptAt: { type: Date, default: () => new Date() },
    sentAt:        { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
EmailOutboxSchema.index({ status: 1, nextAttemptAt: 1 });

const EmailOutbox: Model<IEmailOutbox> = mongoose.model<IEmailOutbox>('EmailOutbox', EmailOutboxSchema);
export default EmailOutbox;
