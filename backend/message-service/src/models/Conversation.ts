import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  lastMessage:  mongoose.Types.ObjectId | null;
  isGroup:      boolean;
  name:         string | null;
  icon:         string | null;
  admins:       mongoose.Types.ObjectId[];
  createdBy:    mongoose.Types.ObjectId | null;
  updatedAt:    Date;
  createdAt:    Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    lastMessage:  { type: Schema.Types.ObjectId, ref: 'Message', default: null },
    isGroup:      { type: Boolean, default: false },
    name:         { type: String, default: null, maxlength: 80 },
    icon:         { type: String, default: null },
    admins:       [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy:    { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

ConversationSchema.index({ participants: 1 });

export default mongoose.model<IConversation>('Conversation', ConversationSchema);
