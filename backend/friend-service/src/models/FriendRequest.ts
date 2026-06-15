import mongoose, { Document, Schema } from 'mongoose';

export type FriendStatus = 'pending' | 'accepted' | 'declined' | 'blocked';

export interface IFriendRequest extends Document {
  sender:    mongoose.Types.ObjectId;
  receiver:  mongoose.Types.ObjectId;
  status:    FriendStatus;
  createdAt: Date;
  updatedAt: Date;
}

const FriendRequestSchema = new Schema<IFriendRequest>(
  {
    sender:   { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    receiver: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    status:   { type: String, enum: ['pending', 'accepted', 'declined', 'blocked'], default: 'pending' },
  },
  { timestamps: true }
);

FriendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });
FriendRequestSchema.index({ receiver: 1, status: 1 });
FriendRequestSchema.index({ sender: 1, status: 1 });

export default mongoose.model<IFriendRequest>('FriendRequest', FriendRequestSchema);
