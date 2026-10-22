import mongoose, { Document, Schema, Types } from 'mongoose';

// The creator earnings ledger: append-only, integer paise, signed amounts. Every balance shown
// to a creator or admin is computed from these rows (daily rollups are a checked cache).
export type LedgerType =
  | 'view_credit'         // +10 per eligible view
  | 'view_reversal'       // − a view credit found invalid (one per credit)
  | 'adjustment'          // ± admin correction with a reason
  | 'withdrawal_hold'     // − amount reserved for a withdrawal request (Phase 7)
  | 'withdrawal_release'; // + hold returned when a withdrawal is rejected/failed/cancelled (Phase 7)

export interface ILedgerEntry extends Document {
  _id:           Types.ObjectId;
  creatorId:     Types.ObjectId;
  type:          LedgerType;
  amountPaise:   number;
  istDay:        string;                 // credits/reversals: day of the view; others: day created
  postId:        Types.ObjectId | null;
  premiumPostId: Types.ObjectId | null;
  viewEventId:   Types.ObjectId | null;  // unique for view_credit
  reversalOf:    Types.ObjectId | null;  // unique for view_reversal
  withdrawalId:  Types.ObjectId | null;
  reason:        string | null;
  actorId:       Types.ObjectId | null;
  reversedAt:    Date | null;            // set on a view_credit once reversed (with its reversal row)
  createdAt:     Date;
}

const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    creatorId:     { type: Schema.Types.ObjectId, required: true },
    type:          { type: String, required: true, enum: ['view_credit', 'view_reversal', 'adjustment', 'withdrawal_hold', 'withdrawal_release'] },
    amountPaise:   { type: Number, required: true, validate: { validator: Number.isInteger, message: 'amountPaise must be an integer' } },
    istDay:        { type: String, required: true },
    postId:        { type: Schema.Types.ObjectId, default: null },
    premiumPostId: { type: Schema.Types.ObjectId, default: null },
    viewEventId:   { type: Schema.Types.ObjectId, default: null },
    reversalOf:    { type: Schema.Types.ObjectId, default: null },
    withdrawalId:  { type: Schema.Types.ObjectId, default: null },
    reason:        { type: String, default: null, maxlength: 500 },
    actorId:       { type: Schema.Types.ObjectId, default: null },
    reversedAt:    { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

LedgerEntrySchema.index({ viewEventId: 1 }, { unique: true, partialFilterExpression: { type: 'view_credit' } });
LedgerEntrySchema.index({ reversalOf: 1 }, { unique: true, partialFilterExpression: { type: 'view_reversal' } });
// One hold and at most one release per withdrawal — funds can't be returned twice
LedgerEntrySchema.index({ withdrawalId: 1, type: 1 }, { unique: true, partialFilterExpression: { type: { $in: ['withdrawal_hold', 'withdrawal_release'] } } });
LedgerEntrySchema.index({ creatorId: 1, type: 1, istDay: 1 });
LedgerEntrySchema.index({ creatorId: 1, createdAt: -1 });
LedgerEntrySchema.index({ postId: 1, istDay: 1 });

export default mongoose.model<ILedgerEntry>('LedgerEntry', LedgerEntrySchema);
