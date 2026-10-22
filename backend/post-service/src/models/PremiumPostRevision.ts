import mongoose, { Schema, Model, Document, Types } from 'mongoose';

// An immutable snapshot a creator submitted for review. Reviewers approve or reject exactly this
// snapshot; the public post is built from an approved one.
export type RevisionStatus = 'in_review' | 'approved' | 'rejected' | 'withdrawn' | 'superseded';

export interface IPremiumPostRevision extends Document {
  _id:            Types.ObjectId;
  premiumPostId:  Types.ObjectId;
  creatorId:      Types.ObjectId;
  version:        number;
  title:          string;
  content:        string;
  plainText:      string;
  wordCount:      number;
  topic:          string;
  subTopic:       string | null;
  tags:           string[];
  coverImage:     string;
  images:         string[];
  isAiImage:      boolean;
  contentHash:    string;
  author:         { name: string; username: string; avatar: string | null };
  status:         RevisionStatus;
  submittedAt:    Date;
  decidedAt:      Date | null;
  // Review
  assignedReviewerId: Types.ObjectId | null;
  assignedAt:     Date | null;
  decidedBy:      Types.ObjectId | null;
  decisionReason: string | null;      // shown to the creator on rejection
  violationId:    Types.ObjectId | null;
  createdAt:      Date;
  updatedAt:      Date;
}

const PremiumPostRevisionSchema = new Schema<IPremiumPostRevision>(
  {
    premiumPostId: { type: Schema.Types.ObjectId, required: true },
    creatorId:     { type: Schema.Types.ObjectId, required: true },
    version:       { type: Number, required: true },
    title:         { type: String, required: true },
    content:       { type: String, required: true },
    plainText:     { type: String, required: true },
    wordCount:     { type: Number, required: true },
    topic:         { type: String, required: true },
    subTopic:      { type: String, default: null },
    tags:          { type: [String], default: [] },
    coverImage:    { type: String, required: true },
    images:        { type: [String], default: [] },
    isAiImage:     { type: Boolean, default: false },
    contentHash:   { type: String, required: true },
    author: {
      name:     { type: String, required: true },
      username: { type: String, required: true },
      avatar:   { type: String, default: null },
    },
    status:        { type: String, enum: ['in_review', 'approved', 'rejected', 'withdrawn', 'superseded'], default: 'in_review' },
    submittedAt:   { type: Date, required: true },
    decidedAt:     { type: Date, default: null },
    assignedReviewerId: { type: Schema.Types.ObjectId, default: null },
    assignedAt:    { type: Date, default: null },
    decidedBy:     { type: Schema.Types.ObjectId, default: null },
    decisionReason: { type: String, default: null, maxlength: 1000 },
    violationId:   { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: true }
);

PremiumPostRevisionSchema.index({ premiumPostId: 1, version: 1 }, { unique: true });
// At most one revision of a post under review at a time (blocks double submits)
PremiumPostRevisionSchema.index({ premiumPostId: 1 }, { unique: true, partialFilterExpression: { status: 'in_review' }, name: 'one_in_review_per_post' });
PremiumPostRevisionSchema.index({ status: 1, submittedAt: 1 });
PremiumPostRevisionSchema.index({ creatorId: 1, submittedAt: -1 });
PremiumPostRevisionSchema.index({ assignedReviewerId: 1, status: 1, submittedAt: 1 });

const PremiumPostRevision: Model<IPremiumPostRevision> = mongoose.model<IPremiumPostRevision>('PremiumPostRevision', PremiumPostRevisionSchema);
export default PremiumPostRevision;
