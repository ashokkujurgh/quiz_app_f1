import mongoose, { Schema } from 'mongoose';

// Short per-user lock so two activations for the same user (e.g. webhook + verify for two
// different payments at once) compute the subscription timeline one after another.
interface IBillingLock { _id: string; owner: string; lockedUntil: Date }

const BillingLockSchema = new Schema<IBillingLock>(
  {
    _id:         { type: String },
    owner:       { type: String, required: true },
    lockedUntil: { type: Date, required: true },
  },
  { versionKey: false }
);

export default mongoose.model<IBillingLock>('BillingLock', BillingLockSchema);
