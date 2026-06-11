import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface ITopic extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const topicSchema = new Schema<ITopic>(
  {
    name:        { type: String, required: true, trim: true, unique: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Topic: Model<ITopic> = mongoose.model<ITopic>('Topic', topicSchema);
export default Topic;
