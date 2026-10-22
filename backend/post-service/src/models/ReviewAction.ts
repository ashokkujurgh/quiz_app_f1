import mongoose, { Schema, Model, Document, Types } from 'mongoose';

// Append-only audit log of everything that happens in premium-post moderation.
export type ReviewActionType =
  | 'submitted' | 'withdrawn' | 'screened' | 'assigned' | 'reassigned' | 'approved' | 'rejected' | 'note'
  | 'violation_confirmed' | 'violation_overturned' | 'appeal_submitted' | 'appeal_upheld' | 'appeal_overturned';

export interface IReviewAction extends Document {
  _id:           Types.ObjectId;
  revisionId:    Types.ObjectId | null;
  premiumPostId: Types.ObjectId | null;
  creatorId:     Types.ObjectId;
  actorId:       Types.ObjectId | null;    // null = system
  actorRole:     'creator' | 'reviewer' | 'admin' | 'system';
  action:        ReviewActionType;
  note:          string | null;            // internal; never shown publicly
  details:       Record<string, unknown>;
  createdAt:     Date;
}

const ReviewActionSchema = new Schema<IReviewAction>(
  {
    revisionId:    { type: Schema.Types.ObjectId, default: null },
    premiumPostId: { type: Schema.Types.ObjectId, default: null },
    creatorId:     { type: Schema.Types.ObjectId, required: true },
    actorId:       { type: Schema.Types.ObjectId, default: null },
    actorRole:     { type: String, enum: ['creator', 'reviewer', 'admin', 'system'], required: true },
    action:        { type: String, required: true },
    note:          { type: String, default: null, maxlength: 2000 },
    details:       { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
ReviewActionSchema.index({ revisionId: 1, createdAt: 1 });
ReviewActionSchema.index({ creatorId: 1, createdAt: -1 });
ReviewActionSchema.index({ actorId: 1, createdAt: -1 });

const ReviewAction: Model<IReviewAction> = mongoose.model<IReviewAction>('ReviewAction', ReviewActionSchema);
export default ReviewAction;
