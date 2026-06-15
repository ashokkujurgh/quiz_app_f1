import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  lastMessage:  mongoose.Types.ObjectId | null;
  updatedAt:    Date;
  createdAt:    Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    lastMessage:  { type: Schema.Types.ObjectId, ref: 'Message', default: null },
  },
  { timestamps: true }
);

ConversationSchema.index({ participants: 1 });

export default mongoose.model<IConversation>('Conversation', ConversationSchema);
