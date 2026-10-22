import mongoose, { Document, Schema, Types } from 'mongoose';
import { SealedBox } from '../services/secretBox';

// A creator's saved payout destination. The full details are stored only encrypted; the masked
// copy is what every screen and list shows.
export type PayoutType = 'bank' | 'upi' | 'amazon_gift_card';

export interface IPayoutMethod extends Document {
  _id:       Types.ObjectId;
  creatorId: Types.ObjectId;
  type:      PayoutType;
  sealed:    SealedBox;
  masked:    Record<string, string>;
  label:     string;
  status:    'active' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
}

const SealedSchema = new Schema<SealedBox>({ v: Number, kid: String, iv: String, tag: String, data: String }, { _id: false });

const PayoutMethodSchema = new Schema<IPayoutMethod>(
  {
    creatorId: { type: Schema.Types.ObjectId, required: true },
    type:      { type: String, enum: ['bank', 'upi', 'amazon_gift_card'], required: true },
    sealed:    { type: SealedSchema, required: true },
    masked:    { type: Schema.Types.Mixed, required: true },
    label:     { type: String, required: true, maxlength: 80 },
    status:    { type: String, enum: ['active', 'deleted'], default: 'active' },
  },
  { timestamps: true }
);
PayoutMethodSchema.index({ creatorId: 1, status: 1 });

export default mongoose.model<IPayoutMethod>('PayoutMethod', PayoutMethodSchema);
