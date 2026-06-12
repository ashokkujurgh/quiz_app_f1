import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface IOption {
  text: string;
}

export interface IQuestion extends Document {
  _id: Types.ObjectId;
  text: string;
  description: string;
  options: [IOption, IOption, IOption, IOption];
  correctOption: 0 | 1 | 2 | 3;
  topic: Types.ObjectId;
  subTopic: Types.ObjectId | null;
  difficulty: 'easy' | 'medium' | 'hard';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const optionSchema = new Schema<IOption>(
  { text: { type: String, required: true, trim: true, maxlength: 500 } },
  { _id: false }
);

const questionSchema = new Schema<IQuestion>(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    options: {
      type: [optionSchema],
      validate: {
        validator: (val: IOption[]) => val.length === 4,
        message: 'Exactly 4 options are required.',
      },
      required: true,
    },
    correctOption: {
      type: Number,
      enum: [0, 1, 2, 3],
      required: true,
    },
    topic: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    subTopic: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

questionSchema.index({ topic: 1, subTopic: 1 });
questionSchema.index({ topic: 1, difficulty: 1 });

const Question: Model<IQuestion> = mongoose.model<IQuestion>('Question', questionSchema);
export default Question;
