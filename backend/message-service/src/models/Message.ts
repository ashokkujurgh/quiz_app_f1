import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  conversation: mongoose.Types.ObjectId;
  sender:       mongoose.Types.ObjectId;
  text:         string;
  imageUrl:     string | null;
  readBy:       mongoose.Types.ObjectId[];
  createdAt:    Date;
  updatedAt:    Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    sender:       { type: Schema.Types.ObjectId, required: true },
    text:         { type: String, default: '', maxlength: 2000 },
    imageUrl:     { type: String, default: null },
    readBy:       [{ type: Schema.Types.ObjectId }],
  },
  { timestamps: true }
);

export default mongoose.model<IMessage>('Message', MessageSchema);
