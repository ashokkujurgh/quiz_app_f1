import mongoose, { Document, Schema, Types } from 'mongoose';
import { SealedBox } from '../services/secretBox';
import { PayoutType } from './PayoutMethod';

// A creator's request to be paid. Creating it puts a hold on the amount in the ledger; rejecting,
// failing or cancelling releases it once; 'paid' needs a payment reference and confirmed fulfilment.
export type WithdrawalStatus = 'requested' | 'under_review' | 'approved' | 'processing' | 'paid' | 'rejected' | 'failed' | 'cancelled';
export const OPEN_STATUSES: WithdrawalStatus[] = ['requested', 'under_review', 'approved', 'processing'];

export interface IStatusChange { status: WithdrawalStatus; at: Date; actorId: Types.ObjectId | null; actorRole: 'creator' | 'admin' | 'system'; note: string | null }

export interface IWithdrawal extends Document {
  _id:             Types.ObjectId;
  creatorId:       Types.ObjectId;
  amountPaise:     number;
  status:          WithdrawalStatus;
  isOpen:          boolean;            // unique per creator while true: one open request at a time
  idempotencyKey:  string;
  method:          { type: PayoutType; payoutMethodId: Types.ObjectId; masked: Record<string, string>; label: string; sealed: SealedBox };
  holdEntryId:     Types.ObjectId | null;
  releaseEntryId:  Types.ObjectId | null;
  rejectionReason: string | null;
  failureReason:   string | null;
  payoutReference: string | null;      // UTR / UPI ref / gift card order id
  payoutProvider:  'manual';
  paidAt:          Date | null;
  history:         IStatusChange[];
  createdAt:       Date;
  updatedAt:       Date;
}

const SealedSchema = new Schema<SealedBox>({ v: Number, kid: String, iv: String, tag: String, data: String }, { _id: false });

const WithdrawalSchema = new Schema<IWithdrawal>(
  {
    creatorId:      { type: Schema.Types.ObjectId, required: true },
    amountPaise:    { type: Number, required: true, min: 1, validate: { validator: Number.isInteger, message: 'amountPaise must be an integer' } },
    status:         { type: String, enum: ['requested', 'under_review', 'approved', 'processing', 'paid', 'rejected', 'failed', 'cancelled'], default: 'requested' },
    isOpen:         { type: Boolean, default: true },
    idempotencyKey: { type: String, required: true },
    method: {
      type:           { type: String, enum: ['bank', 'upi', 'amazon_gift_card'], required: true },
      payoutMethodId: { type: Schema.Types.ObjectId, required: true },
      masked:         { type: Schema.Types.Mixed, required: true },
      label:          { type: String, required: true },
      sealed:         { type: SealedSchema, required: true },
    },
    holdEntryId:     { type: Schema.Types.ObjectId, default: null },
    releaseEntryId:  { type: Schema.Types.ObjectId, default: null },
    rejectionReason: { type: String, default: null, maxlength: 500 },
    failureReason:   { type: String, default: null, maxlength: 500 },
    payoutReference: { type: String, default: null, maxlength: 100 },
    payoutProvider:  { type: String, enum: ['manual'], default: 'manual' },
    paidAt:          { type: Date, default: null },
    history: [{
      _id: false,
      status:    { type: String, required: true },
      at:        { type: Date, required: true },
      actorId:   { type: Schema.Types.ObjectId, default: null },
      actorRole: { type: String, enum: ['creator', 'admin', 'system'], required: true },
      note:      { type: String, default: null, maxlength: 500 },
    }],
  },
  { timestamps: true }
);

WithdrawalSchema.index({ creatorId: 1, isOpen: 1 }, { unique: true, partialFilterExpression: { isOpen: true }, name: 'one_open_withdrawal_per_creator' });
WithdrawalSchema.index({ creatorId: 1, idempotencyKey: 1 }, { unique: true });
WithdrawalSchema.index({ status: 1, createdAt: 1 });
WithdrawalSchema.index({ creatorId: 1, createdAt: -1 });

export default mongoose.model<IWithdrawal>('Withdrawal', WithdrawalSchema);
