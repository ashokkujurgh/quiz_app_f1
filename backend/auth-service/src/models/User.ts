import mongoose, { Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
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
    password: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    avatar:     { type: String, default: null },
    coverImage: { type: String, default: null },
    bio:        { type: String, maxlength: [200, 'Bio cannot exceed 200 characters'], default: '' },
    role:       { type: String, enum: ['user', 'admin'] as UserRole[], default: 'user' },

    authProvider: {
      type: String,
      enum: ['email', 'google', 'firebase'] as AuthProvider[],
      default: 'firebase',
    },
    firebaseUid: { type: String, unique: true, sparse: true },
    googleId:    { type: String, unique: true, sparse: true },

    isEmailVerified: { type: Boolean, default: false },

    refreshTokens: { type: [refreshTokenSchema], default: [], select: false },

    emailVerifyToken:     { type: String, default: null },
    emailVerifyExpires:   { type: Date,   default: null },
    passwordResetToken:   { type: String, default: null },
    passwordResetExpires: { type: Date,   default: null },

    fcmTokens: { type: [String], default: [] },

    isActive: { type: Boolean, default: true },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],

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

// indexes are declared inline on the schema fields above

// ── Hash password before save ─────────────────────────────
userSchema.pre('save', async function (next) {
  const doc = this as any;
  if (!this.isModified('password') || !doc.password) return next();
  doc.password = await bcrypt.hash(doc.password, 12);
  next();
});

// ── Auto-generate username from email ─────────────────────
userSchema.pre('validate', function (next) {
  const doc = this as any;
  if (!doc.username && doc.email) {
    const base = doc.email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');
    doc.username = `${base}_${Math.floor(Math.random() * 9000) + 1000}`;
  }
  next();
});

// ── Instance method: compare password ─────────────────────
userSchema.methods.comparePassword = function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password as string);
};

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export default User;
