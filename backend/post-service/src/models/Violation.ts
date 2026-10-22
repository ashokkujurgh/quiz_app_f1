import mongoose, { Schema, Model, Document, Types } from 'mongoose';

// A policy violation CONFIRMED by a human reviewer when rejecting a premium post.
// Screening results and technical failures never create one. Records are never deleted;
// an overturned violation keeps its record and stops counting.
export type ViolationConsequence = 'warning_1' | 'warning_2' | 'restriction_30d';
export const VIOLATION_CATEGORIES = ['irrelevant', 'low_quality', 'spam', 'misleading', 'unsafe', 'copied', 'promotional', 'view_manipulation', 'inappropriate_image', 'other'] as const;

export interface IViolation extends Document {
  _id:           Types.ObjectId;
  creatorId:     Types.ObjectId;
  premiumPostId: Types.ObjectId;
  revisionId:    Types.ObjectId;
  postTitle:     string;
  category:      typeof VIOLATION_CATEGORIES[number];
  reason:        string;
  confirmedBy:   Types.ObjectId;
  confirmedAt:   Date;
  sequence:      number;                 // nth confirmed violation at the time
  consequence:   ViolationConsequence;
  restrictionId: Types.ObjectId | null;
  status:        'confirmed' | 'overturned';
  overturnedBy:  Types.ObjectId | null;
  overturnedAt:  Date | null;
  overturnReason: string | null;
  appeal: {
    status:      'none' | 'pending' | 'upheld' | 'overturned';
    text:        string | null;
    submittedAt: Date | null;
    decidedBy:   Types.ObjectId | null;
    decidedAt:   Date | null;
    note:        string | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ViolationSchema = new Schema<IViolation>(
  {
    creatorId:     { type: Schema.Types.ObjectId, required: true },
    premiumPostId: { type: Schema.Types.ObjectId, required: true },
    revisionId:    { type: Schema.Types.ObjectId, required: true, unique: true },
    postTitle:     { type: String, required: true },
    category:      { type: String, enum: VIOLATION_CATEGORIES, required: true },
    reason:        { type: String, required: true, maxlength: 1000 },
    confirmedBy:   { type: Schema.Types.ObjectId, required: true },
    confirmedAt:   { type: Date, required: true },
    sequence:      { type: Number, required: true },
    consequence:   { type: String, enum: ['warning_1', 'warning_2', 'restriction_30d'], required: true },
    restrictionId: { type: Schema.Types.ObjectId, default: null },
    status:        { type: String, enum: ['confirmed', 'overturned'], default: 'confirmed' },
    overturnedBy:  { type: Schema.Types.ObjectId, default: null },
    overturnedAt:  { type: Date, default: null },
    overturnReason: { type: String, default: null },
    appeal: {
      status:      { type: String, enum: ['none', 'pending', 'upheld', 'overturned'], default: 'none' },
      text:        { type: String, default: null, maxlength: 2000 },
      submittedAt: { type: Date, default: null },
      decidedBy:   { type: Schema.Types.ObjectId, default: null },
      decidedAt:   { type: Date, default: null },
      note:        { type: String, default: null, maxlength: 1000 },
    },
  },
  { timestamps: true }
);
ViolationSchema.index({ creatorId: 1, status: 1, confirmedAt: -1 });
ViolationSchema.index({ 'appeal.status': 1 });

export const Violation: Model<IViolation> = mongoose.model<IViolation>('Violation', ViolationSchema);

// 30-day block on premium submissions after the 3rd (and each later) confirmed violation.
export interface ICreatorRestriction extends Document {
  _id:         Types.ObjectId;
  creatorId:   Types.ObjectId;
  violationId: Types.ObjectId;
  startsAt:    Date;
  endsAt:      Date;
  status:      'active' | 'lifted';
  liftedBy:    Types.ObjectId | null;
  liftedAt:    Date | null;
  liftReason:  string | null;
  createdAt:   Date;
}

const CreatorRestrictionSchema = new Schema<ICreatorRestriction>(
  {
    creatorId:   { type: Schema.Types.ObjectId, required: true },
    violationId: { type: Schema.Types.ObjectId, required: true, unique: true },
    startsAt:    { type: Date, required: true },
    endsAt:      { type: Date, required: true },
    status:      { type: String, enum: ['active', 'lifted'], default: 'active' },
    liftedBy:    { type: Schema.Types.ObjectId, default: null },
    liftedAt:    { type: Date, default: null },
    liftReason:  { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
CreatorRestrictionSchema.index({ creatorId: 1, status: 1, endsAt: -1 });

export const CreatorRestriction: Model<ICreatorRestriction> = mongoose.model<ICreatorRestriction>('CreatorRestriction', CreatorRestrictionSchema);

// One row per creator: an atomic counter so two simultaneous confirmations get sequence 2 and 3,
// never 2 and 2. A cache of the Violation rows (recomputed on overturn).
export interface ICreatorStanding extends Document {
  creatorId:        Types.ObjectId;
  confirmedCount:   number;
  restrictedUntil:  Date | null;
}

const CreatorStandingSchema = new Schema<ICreatorStanding>(
  {
    creatorId:       { type: Schema.Types.ObjectId, required: true, unique: true },
    confirmedCount:  { type: Number, default: 0 },
    restrictedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

export const CreatorStanding: Model<ICreatorStanding> = mongoose.model<ICreatorStanding>('CreatorStanding', CreatorStandingSchema);
