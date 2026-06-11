import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface ISubTopic extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  topic: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subTopicSchema = new Schema<ISubTopic>(
  {
    name:        { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    topic:       { type: Schema.Types.ObjectId, ref: 'Topic', required: true, index: true },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Name unique per topic
subTopicSchema.index({ topic: 1, name: 1 }, { unique: true });

const SubTopic: Model<ISubTopic> = mongoose.model<ISubTopic>('SubTopic', subTopicSchema);
export default SubTopic;
