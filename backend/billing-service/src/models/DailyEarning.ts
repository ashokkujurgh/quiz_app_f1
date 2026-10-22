import mongoose, { Document, Schema, Types } from 'mongoose';

// Per creator, per post, per IST day totals for fast dashboards and charts. A cache of the ledger
// and view events, rebuilt and checked by the reconciliation job.
export interface IDailyEarning extends Document {
  creatorId:       Types.ObjectId;
  postId:          Types.ObjectId;
  premiumPostId:   Types.ObjectId;
  istDay:          string;
  eligibleViews:   number;
  ineligibleViews: number;
  creditedPaise:   number;
  reversedPaise:   number;   // positive number: amount reversed from this day's credits
  lastViewAt:      Date | null;
}

const DailyEarningSchema = new Schema<IDailyEarning>(
  {
    creatorId:       { type: Schema.Types.ObjectId, required: true },
    postId:          { type: Schema.Types.ObjectId, required: true },
    premiumPostId:   { type: Schema.Types.ObjectId, required: true },
    istDay:          { type: String, required: true },
    eligibleViews:   { type: Number, default: 0 },
    ineligibleViews: { type: Number, default: 0 },
    creditedPaise:   { type: Number, default: 0 },
    reversedPaise:   { type: Number, default: 0 },
    lastViewAt:      { type: Date, default: null },
  },
  { timestamps: true }
);
DailyEarningSchema.index({ creatorId: 1, postId: 1, istDay: 1 }, { unique: true });
DailyEarningSchema.index({ creatorId: 1, istDay: 1 });

export default mongoose.model<IDailyEarning>('DailyEarning', DailyEarningSchema);
