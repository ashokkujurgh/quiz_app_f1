import { Schema, model, Document, Types } from 'mongoose';

export interface IGameAnswer extends Document {
  quizId:        Types.ObjectId;
  userId:        string;
  questionId:    string;
  questionIndex: number;
  answer:        number;  // -1 = unanswered
  isCorrect:     boolean;
  answeredAt:    Date;
}

const GameAnswerSchema = new Schema<IGameAnswer>({
  quizId:        { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
  userId:        { type: String, required: true, index: true },
  questionId:    { type: String, required: true },
  questionIndex: { type: Number, required: true },
  answer:        { type: Number, default: -1 },
  isCorrect:     { type: Boolean, default: false },
  answeredAt:    { type: Date, default: () => new Date() },
});

GameAnswerSchema.index({ quizId: 1, userId: 1, questionIndex: 1 }, { unique: true });

export default model<IGameAnswer>('GameAnswer', GameAnswerSchema);
