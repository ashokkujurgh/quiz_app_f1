import mongoose, { Document, Schema, Types } from 'mongoose';

// One counted view: a given viewer on a given post within one dedupe window. The unique index
// is what makes double counting impossible, even under concurrency or retries.
export type IneligibleReason = 'creator_plan_inactive' | 'creator_suspended' | 'self_view' | 'viewer_inactive' | 'suspicious_ip' | null;

export interface IViewEvent extends Document {
  _id:            Types.ObjectId;
  postId:         Types.ObjectId;     // public Post id
  premiumPostId:  Types.ObjectId;
  creatorId:      Types.ObjectId;
  viewerKey:      string;             // 'u:<userId>' or 'a:<random anonymous id>' — never personal data
  viewerType:     'user' | 'anon';
  windowStart:    Date;
  istDay:         string;
  occurredAt:     Date;
  eligible:       boolean;
  ineligibleReason: IneligibleReason;
  ipHash:         string | null;      // daily-rotating salted hash, only for abuse checks
  ledgerEntryId:  Types.ObjectId | null;
  createdAt:      Date;
}

const ViewEventSchema = new Schema<IViewEvent>(
  {
    postId:           { type: Schema.Types.ObjectId, required: true },
    premiumPostId:    { type: Schema.Types.ObjectId, required: true },
    creatorId:        { type: Schema.Types.ObjectId, required: true },
    viewerKey:        { type: String, required: true, maxlength: 100 },
    viewerType:       { type: String, enum: ['user', 'anon'], required: true },
    windowStart:      { type: Date, required: true },
    istDay:           { type: String, required: true },
    occurredAt:       { type: Date, required: true },
    eligible:         { type: Boolean, required: true },
    ineligibleReason: { type: String, default: null },
    ipHash:           { type: String, default: null },
    ledgerEntryId:    { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ViewEventSchema.index({ postId: 1, viewerKey: 1, windowStart: 1 }, { unique: true });
ViewEventSchema.index({ creatorId: 1, istDay: 1 });
ViewEventSchema.index({ postId: 1, ipHash: 1, istDay: 1, viewerType: 1 });
ViewEventSchema.index({ eligible: 1, ledgerEntryId: 1, createdAt: 1 });

export default mongoose.model<IViewEvent>('ViewEvent', ViewEventSchema);
