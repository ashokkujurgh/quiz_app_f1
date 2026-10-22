import mongoose, { Schema, Model, Document, Types } from 'mongoose';

// A generated image waiting for the creator to accept, regenerate or discard it.
export interface IAiImageCandidate extends Document {
  _id:           Types.ObjectId;
  premiumPostId: Types.ObjectId;
  creatorId:     Types.ObjectId;
  prompt:        string;
  url:           string;
  key:           string;
  width:         number;
  height:        number;
  bytes:         number;
  status:        'candidate' | 'accepted' | 'discarded' | 'expired';
  expiresAt:     Date;
  createdAt:     Date;
}

const AiImageCandidateSchema = new Schema<IAiImageCandidate>(
  {
    premiumPostId: { type: Schema.Types.ObjectId, required: true },
    creatorId:     { type: Schema.Types.ObjectId, required: true },
    prompt:        { type: String, required: true },
    url:           { type: String, required: true },
    key:           { type: String, required: true },
    width:         { type: Number, required: true },
    height:        { type: Number, required: true },
    bytes:         { type: Number, required: true },
    status:        { type: String, enum: ['candidate', 'accepted', 'discarded', 'expired'], default: 'candidate' },
    expiresAt:     { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
AiImageCandidateSchema.index({ status: 1, expiresAt: 1 });
AiImageCandidateSchema.index({ premiumPostId: 1, createdAt: -1 });

export const AiImageCandidate: Model<IAiImageCandidate> = mongoose.model<IAiImageCandidate>('AiImageCandidate', AiImageCandidateSchema);

// Per-creator, per-IST-day generation counter (also a short "one at a time" lock).
export interface IAiImageUsage extends Document {
  creatorId:     Types.ObjectId;
  istDay:        string;
  count:         number;
  inFlightUntil: Date | null;
}

const AiImageUsageSchema = new Schema<IAiImageUsage>(
  {
    creatorId:     { type: Schema.Types.ObjectId, required: true },
    istDay:        { type: String, required: true },
    count:         { type: Number, default: 0 },
    inFlightUntil: { type: Date, default: null },
  },
  { timestamps: true }
);
AiImageUsageSchema.index({ creatorId: 1, istDay: 1 }, { unique: true });

export const AiImageUsage: Model<IAiImageUsage> = mongoose.model<IAiImageUsage>('AiImageUsage', AiImageUsageSchema);
