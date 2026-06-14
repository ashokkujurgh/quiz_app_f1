import { Schema, model, Document, Types } from 'mongoose';

export interface IHistoryAnswer {
  questionIndex: number;
  questionId:    string;
  questionText:  string;
  options:       string[];
  correctOption: number;
  userAnswer:    number; // -1 = unanswered
  isCorrect:     boolean;
}

export interface IGameHistory extends Document {
  quizId:      Types.ObjectId;
  quizTitle:   string;
  userId:      string;
  userName:    string;
  userAvatar?: string;
  score:       number;
  total:       number;
  percentage:  number;
  rank:        number;
  timeTaken:   number;
  completedAt: Date;
  answers:     IHistoryAnswer[];
}

const HistoryAnswerSchema = new Schema<IHistoryAnswer>({
  questionIndex: { type: Number, required: true },
  questionId:    { type: String, required: true },
  questionText:  { type: String, required: true },
  options:       [{ type: String }],
  correctOption: { type: Number, required: true },
  userAnswer:    { type: Number, default: -1 },
  isCorrect:     { type: Boolean, default: false },
}, { _id: false });

const GameHistorySchema = new Schema<IGameHistory>({
  quizId:      { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
  quizTitle:   { type: String, required: true },
  userId:      { type: String, required: true, index: true },
  userName:    { type: String, required: true },
  userAvatar:  { type: String },
  score:       { type: Number, required: true },
  total:       { type: Number, required: true },
  percentage:  { type: Number, required: true },
  rank:        { type: Number, required: true },
  timeTaken:   { type: Number, required: true },
  completedAt: { type: Date, default: () => new Date() },
  answers:     [HistoryAnswerSchema],
});

GameHistorySchema.index({ userId: 1, completedAt: -1 });

export default model<IGameHistory>('GameHistory', GameHistorySchema);
