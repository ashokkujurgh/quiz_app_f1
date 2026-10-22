import mongoose, { Document, Schema, Types } from 'mongoose';
import { PlanCode } from '../config/plans';

// One document per paid period. Documents are history: they are never deleted, only
// moved to a final status. The user's current plan = the highest-tier 'active'
// subscription with startsAt <= now < endsAt; none means Free.
export type SubscriptionStatus =
  | 'active'     // paid; current, or queued to start later
  | 'expired'    // endsAt passed (set by the expiry job; entitlement never depends on this flag)
  | 'converted'  // unused time moved into a higher-tier upgrade
  | 'refunded'   // payment fully refunded; access ended
  | 'revoked';   // ended by an admin

export interface IUserSubscription extends Document {
  _id:              Types.ObjectId;
  userId:           Types.ObjectId;
  planCode:         Exclude<PlanCode, 'free'>;
  tier:             number;
  status:           SubscriptionStatus;
  startsAt:         Date;
  endsAt:           Date;
  paymentId:        Types.ObjectId | null;
  source:           'razorpay' | 'admin_grant';
  bonusDays:        number;          // extra days from converted lower-tier time
  convertedInto:    Types.ObjectId | null;
  renewalReminders: boolean;
  statusReason:     string | null;
  createdAt:        Date;
  updatedAt:        Date;
}

const UserSubscriptionSchema = new Schema<IUserSubscription>(
  {
    userId:           { type: Schema.Types.ObjectId, required: true },
    planCode:         { type: String, required: true, enum: ['premium', 'creator'] },
    tier:             { type: Number, required: true },
    status:           { type: String, required: true, enum: ['active', 'expired', 'converted', 'refunded', 'revoked'], default: 'active' },
    startsAt:         { type: Date, required: true },
    endsAt:           { type: Date, required: true },
    paymentId:        { type: Schema.Types.ObjectId, default: null },
    source:           { type: String, enum: ['razorpay', 'admin_grant'], default: 'razorpay' },
    bonusDays:        { type: Number, default: 0 },
    convertedInto:    { type: Schema.Types.ObjectId, default: null },
    renewalReminders: { type: Boolean, default: true },
    statusReason:     { type: String, default: null },
  },
  { timestamps: true }
);

UserSubscriptionSchema.index({ userId: 1, status: 1, endsAt: -1 });
// One subscription per payment — a second activation of the same payment can never create a second period
UserSubscriptionSchema.index({ paymentId: 1 }, { unique: true, partialFilterExpression: { paymentId: { $type: 'objectId' } } });
UserSubscriptionSchema.index({ status: 1, endsAt: 1 });

export default mongoose.model<IUserSubscription>('UserSubscription', UserSubscriptionSchema);
