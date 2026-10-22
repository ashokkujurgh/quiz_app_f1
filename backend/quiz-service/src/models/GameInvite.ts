import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';

// An invitation to a custom multiplayer quiz. Accepting reserves the invitee's play credit
// (Free plan); the credit is used when they join the game and given back if the invite is
// declined, cancelled or expires before they play. Quiz.allowedUsers stays the list of who may join.
export interface IGameInvite extends Document {
  _id:         Types.ObjectId;
  quizId:      Types.ObjectId;
  inviterId:   Types.ObjectId;
  inviteeId:   Types.ObjectId;
  status:      InviteStatus;
  refKey:      string;          // the play credit key of the occurrence this invite is for
  expiresAt:   Date;
  respondedAt: Date | null;
  createdAt:   Date;
  updatedAt:   Date;
}

const GameInviteSchema = new Schema<IGameInvite>(
  {
    quizId:      { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    inviterId:   { type: Schema.Types.ObjectId, required: true },
    inviteeId:   { type: Schema.Types.ObjectId, required: true },
    status:      { type: String, enum: ['pending', 'accepted', 'declined', 'cancelled', 'expired'], default: 'pending' },
    refKey:      { type: String, required: true },
    expiresAt:   { type: Date, required: true },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

GameInviteSchema.index({ quizId: 1, inviteeId: 1 }, { unique: true });
GameInviteSchema.index({ inviteeId: 1, status: 1, expiresAt: 1 });
GameInviteSchema.index({ status: 1, expiresAt: 1 });

const GameInvite: Model<IGameInvite> = mongoose.model<IGameInvite>('GameInvite', GameInviteSchema);
export default GameInvite;
