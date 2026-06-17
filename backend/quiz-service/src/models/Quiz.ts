import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export type SelectionMode  = 'manual' | 'random';
export type ScheduleType   = 'once' | 'daily' | 'weekly' | 'monthly';
export type Participation  = 'public' | 'private' | 'invite_only';
export type QuizStatus     = 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';

export interface IQuiz extends Document {
  _id: Types.ObjectId;

  title: string;
  description: string;

  // Question setup
  questionCount: number;
  selectionMode: SelectionMode;
  questions: Types.ObjectId[];         // populated manually or by random pick
  topic: Types.ObjectId | null;        // used when selectionMode = 'random'
  subTopic: Types.ObjectId | null;

  // Media
  image: string | null;                // public CDN URL, optional

  // Timing
  timezone: string;                    // IANA tz, e.g. "Asia/Kolkata"
  scheduledAt: Date;                   // when the quiz goes live
  durationMinutes: number;             // how long the quiz runs
  timeLimitPerQuestion: number | null; // seconds per question, null = no limit

  // Recurrence
  scheduleType: ScheduleType;
  endDate: Date | null;                // optional end date for recurring quizzes

  // Access
  participation: Participation;
  allowedUsers: Types.ObjectId[];      // relevant for 'private' / 'invite_only'

  // Lifecycle
  status: QuizStatus;
  startedAt: Date | null;
  endedAt: Date | null;
  postCreated: boolean;

  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const quizSchema = new Schema<IQuiz>(
  {
    title:         { type: String, required: true, trim: true, maxlength: 200 },
    description:   { type: String, trim: true, default: '' },

    questionCount: { type: Number, required: true, min: 1, max: 200 },
    selectionMode: { type: String, enum: ['manual', 'random'], default: 'random' },
    questions:     [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    topic:         { type: Schema.Types.ObjectId, default: null },
    subTopic:      { type: Schema.Types.ObjectId, default: null },

    image:           { type: String, default: null },

    timezone:        { type: String, required: true, default: 'Asia/Kolkata' },
    scheduledAt:     { type: Date, required: true },
    durationMinutes:        { type: Number, required: true, min: 1, default: 30 },
    timeLimitPerQuestion:   { type: Number, default: null, min: 5 },

    scheduleType: { type: String, enum: ['once', 'daily', 'weekly', 'monthly'], default: 'once' },
    endDate:      { type: Date, default: null },

    participation: { type: String, enum: ['public', 'private', 'invite_only'], default: 'public' },
    allowedUsers:  [{ type: Schema.Types.ObjectId, ref: 'User' }],

    status:      { type: String, enum: ['draft', 'scheduled', 'active', 'completed', 'cancelled'], default: 'draft' },
    startedAt:   { type: Date, default: null },
    endedAt:     { type: Date, default: null },
    postCreated: { type: Boolean, default: false },

    createdBy: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

quizSchema.index({ status: 1 });
quizSchema.index({ scheduledAt: 1, status: 1 });
quizSchema.index({ createdBy: 1 });

const Quiz: Model<IQuiz> = mongoose.model<IQuiz>('Quiz', quizSchema);
export default Quiz;
