import mongoose, { Schema, Model, Document, Types } from 'mongoose';

// Views that passed every check here but could not be delivered to billing-service yet.
// Retried by a job; billing's unique index makes re-delivery harmless.
export interface IPendingView extends Document {
  postId:        Types.ObjectId;
  premiumPostId: Types.ObjectId;
  creatorId:     Types.ObjectId;
  viewerKey:     string;
  ipHash:        string | null;
  occurredAt:    Date;
  dedupeKey:     string;
  attempts:      number;
  nextAttemptAt: Date;
}

const PendingViewSchema = new Schema<IPendingView>(
  {
    postId:        { type: Schema.Types.ObjectId, required: true },
    premiumPostId: { type: Schema.Types.ObjectId, required: true },
    creatorId:     { type: Schema.Types.ObjectId, required: true },
    viewerKey:     { type: String, required: true },
    ipHash:        { type: String, default: null },
    occurredAt:    { type: Date, required: true },
    dedupeKey:     { type: String, required: true, unique: true },
    attempts:      { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: () => new Date() },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
PendingViewSchema.index({ nextAttemptAt: 1 });
// Give up on views older than 2 days (billing would clamp them anyway)
PendingViewSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 86_400 });

const PendingView: Model<IPendingView> = mongoose.model<IPendingView>('PendingView', PendingViewSchema);
export default PendingView;
