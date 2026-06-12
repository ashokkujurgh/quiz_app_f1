import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export type QuizTopic =
  | 'General Science' | 'Electrical' | 'History' | 'Geography'
  | 'Mathematics' | 'Physics' | 'Chemistry' | 'Technology';

export const TOPICS: QuizTopic[] = [
  'General Science', 'Electrical', 'History', 'Geography',
  'Mathematics', 'Physics', 'Chemistry', 'Technology',
];

// ── Embedded author snapshot (denormalised) ───────────────────────────────────
export interface IAuthorSnapshot {
  userId: Types.ObjectId;
  name: string;
  username: string;
  avatar: string | null;
}

// ── Embedded quiz result ──────────────────────────────────────────────────────
export interface IQuizResult {
  quizId: string;
  quizTitle: string;
  category: QuizTopic;
  score: number;
  total: number;
  percentage: number;
  rank?: number;
  duration: number;
}

// ── Comment ───────────────────────────────────────────────────────────────────
export interface IComment {
  _id: Types.ObjectId;
  author: IAuthorSnapshot;
  content: string;
  likes: number;
  likedBy: Types.ObjectId[];
  createdAt: Date;
}

// ── Post ──────────────────────────────────────────────────────────────────────
export interface IPost extends Document {
  _id: Types.ObjectId;
  author: IAuthorSnapshot;
  content: string;
  image: string | null;
  topic: QuizTopic;
  subTopic: string | null;
  timezone: string;
  likes: number;
  likedBy: Types.ObjectId[];
  shares: number;
  savedBy: Types.ObjectId[];
  comments: IComment[];
  quizResult: IQuizResult | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const authorSchema = new Schema<IAuthorSnapshot>(
  {
    userId:   { type: Schema.Types.ObjectId, required: true },
    name:     { type: String, required: true },
    username: { type: String, required: true },
    avatar:   { type: String, default: null },
  },
  { _id: false }
);

const quizResultSchema = new Schema<IQuizResult>(
  {
    quizId:     { type: String, required: true },
    quizTitle:  { type: String, required: true },
    category:   { type: String, enum: TOPICS, required: true },
    score:      { type: Number, required: true },
    total:      { type: Number, required: true },
    percentage: { type: Number, required: true },
    rank:       { type: Number },
    duration:   { type: Number, required: true },
  },
  { _id: false }
);

const commentSchema = new Schema<IComment>(
  {
    author:  { type: authorSchema, required: true },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    likes:   { type: Number, default: 0 },
    likedBy: { type: [Schema.Types.ObjectId], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// ── Main schema ───────────────────────────────────────────────────────────────

const postSchema = new Schema<IPost>(
  {
    author:     { type: authorSchema, required: true },
    content:    { type: String, required: true, trim: true, maxlength: 2000 },
    image:      { type: String, default: null },
    topic:      { type: String, enum: TOPICS, required: true },
    subTopic:   { type: String, default: null },
    timezone:   { type: String, default: 'UTC' },
    likes:      { type: Number, default: 0 },
    likedBy:    { type: [Schema.Types.ObjectId], default: [] },
    shares:     { type: Number, default: 0 },
    savedBy:    { type: [Schema.Types.ObjectId], default: [] },
    comments:   { type: [commentSchema], default: [] },
    quizResult: { type: quizResultSchema, default: null },
    isActive:   { type: Boolean, default: true },
  },
  { timestamps: true }
);

postSchema.index({ 'author.userId': 1 });
postSchema.index({ topic: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });

const Post: Model<IPost> = mongoose.model<IPost>('Post', postSchema);
export default Post;
