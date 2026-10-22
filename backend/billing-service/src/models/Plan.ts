import mongoose, { Document, Schema } from 'mongoose';
import { DEFAULT_PLANS, PlanCode, PlanFeatures } from '../config/plans';

export interface IPlan extends Document {
  code:        PlanCode;
  name:        string;
  pricePaise:  number;
  currency:    'INR';
  periodDays:  number;
  tier:        number;
  features:    PlanFeatures;
  dailyLimits: { quiz_play: number | null; quiz_create: number | null };
  description: string;
  isActive:    boolean;
}

const PlanSchema = new Schema<IPlan>(
  {
    code:        { type: String, required: true, unique: true, enum: ['free', 'premium', 'creator'] },
    name:        { type: String, required: true },
    pricePaise:  { type: Number, required: true, min: 0, validate: Number.isInteger },
    currency:    { type: String, default: 'INR' },
    periodDays:  { type: Number, required: true, min: 0 },
    tier:        { type: Number, required: true },
    features: {
      unlimitedQuizPlay:   { type: Boolean, default: false },
      unlimitedQuizCreate: { type: Boolean, default: false },
      creatorTools:        { type: Boolean, default: false },
    },
    dailyLimits: {
      quiz_play:   { type: Number, default: null },
      quiz_create: { type: Number, default: null },
    },
    description: { type: String, default: '' },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Plan = mongoose.model<IPlan>('Plan', PlanSchema);

/** Insert missing plans; never overwrite values already in the DB. */
export async function seedPlans(): Promise<void> {
  for (const p of DEFAULT_PLANS) {
    await Plan.updateOne({ code: p.code }, { $setOnInsert: { ...p, currency: 'INR', isActive: true } }, { upsert: true });
  }
}

export default Plan;
