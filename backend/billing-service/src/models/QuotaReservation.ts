import mongoose, { Document, Schema, Types } from 'mongoose';
import { CreditType } from './UsageCounter';

// One row per (user, credit, action). `refKey` names the action, e.g. "play:<quizId>:<occurrence>"
// or "create:<quizId>", so repeating the same action never costs a second credit.
export interface IQuotaReservation extends Document {
  _id:        Types.ObjectId;
  userId:     Types.ObjectId;
  credit:     CreditType;
  refKey:     string;
  istDay:     string;                 // the day the credit counts against
  status:     'reserved' | 'consumed' | 'released';
  unlimited:  boolean;                // made while the user had an unlimited plan; never touched a counter
  expiresAt:  Date;                   // unconsumed reservations are released after this
  consumedAt: Date | null;
  releasedAt: Date | null;
  releaseReason: string | null;
  createdAt:  Date;
  updatedAt:  Date;
}

const QuotaReservationSchema = new Schema<IQuotaReservation>(
  {
    userId:        { type: Schema.Types.ObjectId, required: true },
    credit:        { type: String, required: true, enum: ['quiz_play', 'quiz_create'] },
    refKey:        { type: String, required: true, maxlength: 200 },
    istDay:        { type: String, required: true },
    status:        { type: String, required: true, enum: ['reserved', 'consumed', 'released'], default: 'reserved' },
    unlimited:     { type: Boolean, default: false },
    expiresAt:     { type: Date, required: true },
    consumedAt:    { type: Date, default: null },
    releasedAt:    { type: Date, default: null },
    releaseReason: { type: String, default: null },
  },
  { timestamps: true }
);

QuotaReservationSchema.index({ userId: 1, credit: 1, refKey: 1 }, { unique: true });
QuotaReservationSchema.index({ status: 1, expiresAt: 1 });
QuotaReservationSchema.index({ refKey: 1, status: 1 });
QuotaReservationSchema.index({ userId: 1, istDay: 1, credit: 1, status: 1 });

export default mongoose.model<IQuotaReservation>('QuotaReservation', QuotaReservationSchema);
