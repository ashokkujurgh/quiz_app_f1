import mongoose, { Document, Schema, Types } from 'mongoose';

export type CreditType = 'quiz_play' | 'quiz_create';
export const CREDIT_TYPES: CreditType[] = ['quiz_play', 'quiz_create'];

// Fast, atomically-updated count of a user's credits for one IST day. It is a cache of the
// QuotaReservation rows for that day (the reconcile job rebuilds it from them).
export interface IUsageCounter extends Document {
  userId:   Types.ObjectId;
  istDay:   string;       // 'YYYY-MM-DD' in IST
  credit:   CreditType;
  used:     number;       // consumed
  reserved: number;       // held, not yet consumed
}

const UsageCounterSchema = new Schema<IUsageCounter>(
  {
    userId:   { type: Schema.Types.ObjectId, required: true },
    istDay:   { type: String, required: true },
    credit:   { type: String, required: true, enum: ['quiz_play', 'quiz_create'] },
    used:     { type: Number, default: 0, min: 0 },
    reserved: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

UsageCounterSchema.index({ userId: 1, istDay: 1, credit: 1 }, { unique: true });

export default mongoose.model<IUsageCounter>('UsageCounter', UsageCounterSchema);
