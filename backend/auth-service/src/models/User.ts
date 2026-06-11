import mongoose, { Schema, Model } from 'mongoose';
import { IUser, IRefreshToken, IUserStats, UserRole, AuthProvider } from '../types';

// ── Sub-schemas ───────────────────────────────────────────
const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    token:      { type: String, required: true },
    createdAt:  { type: Date, default: Date.now },
    expiresAt:  { type: Date, required: true },
    deviceInfo: { type: String },
  },
  { _id: false }
);

const statsSchema = new Schema<IUserStats>(
  {
    friends:      { type: Number, default: 0 },
    posts:        { type: Number, default: 0 },
    quizzesTaken: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
  },
  { _id: false }
);

// ── Main schema ───────────────────────────────────────────
const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-z0-9_]+$/, 'Username can only contain letters, numbers and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    avatar:     { type: String, default: null },
    coverImage: { type: String, default: null },
    bio:        { type: String, maxlength: [200, 'Bio cannot exceed 200 characters'], default: '' },
    role:       { type: String, enum: ['user', 'admin'] as UserRole[], default: 'user' },

    authProvider: {
      type: String,
      enum: ['google', 'firebase'] as AuthProvider[],
      default: 'firebase',
    },
    firebaseUid: { type: String, unique: true, sparse: true },
    googleId:    { type: String, unique: true, sparse: true },

    isEmailVerified: { type: Boolean, default: false },

    refreshTokens: { type: [refreshTokenSchema], default: [], select: false },

    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },

    stats: { type: statsSchema, default: () => ({}) },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret['refreshTokens'] = undefined;
        ret['__v']           = undefined;
        return ret;
      },
    },
  }
);

// ── Indexes ───────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ firebaseUid: 1 });

// ── Auto-generate username from email ─────────────────────
userSchema.pre('validate', function (next) {
  if (!this.username && this.email) {
    const base = this.email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');
    this.username = `${base}_${Math.floor(Math.random() * 9000) + 1000}`;
  }
  next();
});

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export default User;
