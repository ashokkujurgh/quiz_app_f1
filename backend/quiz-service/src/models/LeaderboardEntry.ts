import { Schema, model, Document, Types } from 'mongoose';

export interface ILeaderboardEntry extends Document {
  quizId:      Types.ObjectId;
  userId:      string;
  userName:    string;
  userAvatar?: string;
  score:       number;
  total:       number;
  percentage:  number;
  rank:        number;
  timeTaken:   number; // seconds
  completedAt: Date;
}

const LeaderboardEntrySchema = new Schema<ILeaderboardEntry>({
  quizId:      { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
  userId:      { type: String, required: true },
  userName:    { type: String, required: true },
  userAvatar:  { type: String },
  score:       { type: Number, required: true },
  total:       { type: Number, required: true },
  percentage:  { type: Number, required: true },
  rank:        { type: Number, required: true },
  timeTaken:   { type: Number, required: true },
  completedAt: { type: Date, default: () => new Date() },
});

LeaderboardEntrySchema.index({ quizId: 1, rank: 1 });

export default model<ILeaderboardEntry>('LeaderboardEntry', LeaderboardEntrySchema);
