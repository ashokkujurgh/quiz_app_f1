import mongoose, { Schema, Model, Document, Types } from 'mongoose';

// The creator's private workspace for one premium post. Nothing here is public: a public
// `Post` (isPremium: true) is created only when a reviewer approves a revision, and it always
// shows the *approved* revision while newer edits wait for review.
//
//   status       — the live version: 'draft' (never approved) | 'published' | 'unpublished'
//   reviewState  — the latest submission: 'none' | 'in_review' | 'approved' | 'rejected'
export type PremiumStatus = 'draft' | 'published' | 'unpublished';
export type ReviewState   = 'none' | 'in_review' | 'approved' | 'rejected';

export interface IPremiumWorkingCopy {
  title:       string;
  content:     string;             // sanitised HTML
  topic:       string;
  subTopic:    string | null;
  tags:        string[];
  coverImage:  string | null;
  images:      string[];           // extra images (cover not included), max 4
  isAiImage:   boolean;            // cover was AI-generated
}

export interface IPremiumPost extends Document {
  _id:               Types.ObjectId;
  creatorId:         Types.ObjectId;
  status:            PremiumStatus;
  reviewState:       ReviewState;
  draft:             IPremiumWorkingCopy;
  draftHash:         string;           // hash of the working copy
  submittedHash:     string | null;    // hash of the last submitted revision
  publicPostId:      Types.ObjectId | null;
  liveRevisionId:    Types.ObjectId | null;
  latestRevisionId:  Types.ObjectId | null;
  version:           number;           // number of revisions submitted so far
  submittedAt:       Date | null;
  publishedAt:       Date | null;
  unpublishedAt:     Date | null;
  lastRejectionReason: string | null;
  deletedAt:         Date | null;
  createdAt:         Date;
  updatedAt:         Date;
}

const WorkingCopySchema = new Schema<IPremiumWorkingCopy>(
  {
    title:      { type: String, default: '', trim: true, maxlength: 150 },
    content:    { type: String, default: '', maxlength: 40000 },
    topic:      { type: String, default: '', trim: true, maxlength: 80 },
    subTopic:   { type: String, default: null, trim: true, maxlength: 80 },
    tags:       { type: [String], default: [] },
    coverImage: { type: String, default: null },
    images:     { type: [String], default: [] },
    isAiImage:  { type: Boolean, default: false },
  },
  { _id: false }
);

const PremiumPostSchema = new Schema<IPremiumPost>(
  {
    creatorId:        { type: Schema.Types.ObjectId, required: true },
    status:           { type: String, enum: ['draft', 'published', 'unpublished'], default: 'draft' },
    reviewState:      { type: String, enum: ['none', 'in_review', 'approved', 'rejected'], default: 'none' },
    draft:            { type: WorkingCopySchema, default: () => ({}) },
    draftHash:        { type: String, default: '' },
    submittedHash:    { type: String, default: null },
    publicPostId:     { type: Schema.Types.ObjectId, default: null },
    liveRevisionId:   { type: Schema.Types.ObjectId, default: null },
    latestRevisionId: { type: Schema.Types.ObjectId, default: null },
    version:          { type: Number, default: 0 },
    submittedAt:      { type: Date, default: null },
    publishedAt:      { type: Date, default: null },
    unpublishedAt:    { type: Date, default: null },
    lastRejectionReason: { type: String, default: null },
    deletedAt:        { type: Date, default: null },
  },
  { timestamps: true }
);

PremiumPostSchema.index({ creatorId: 1, deletedAt: 1, updatedAt: -1 });
PremiumPostSchema.index({ publicPostId: 1 }, { unique: true, partialFilterExpression: { publicPostId: { $type: 'objectId' } } });

const PremiumPost: Model<IPremiumPost> = mongoose.model<IPremiumPost>('PremiumPost', PremiumPostSchema);
export default PremiumPost;
