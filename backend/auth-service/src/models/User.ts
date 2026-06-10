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
    friends:       { type: Number, default: 0 },
    posts:         { type: Number, default: 0 },
    quizzesTaken:  { type: Number, default: 0 },
    averageScore:  { type: Number, default: 0 },
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
    avatar:      { type: String, default: null },
    coverImage:  { type: String, default: null },
    bio:         { type: String, maxlength: [200, 'Bio cannot exceed 200 characters'], default: '' },
    role:        { type: String, enum: ['user', 'admin'] as UserRole[], default: 'user' },

    authProvider: {
      type: String,
      enum: ['email', 'google', 'firebase'] as AuthProvider[],
      default: 'email',
    },
    firebaseUid: { type: String, unique: true, sparse: true },
    googleId:    { type: String, unique: true, sparse: true },

    isEmailVerified:          { type: Boolean, default: false },
    emailVerificationToken:   { type: String },
    emailVerificationExpires: { type: Date },

    passwordResetToken:   { type: String },
    passwordResetExpires: { type: Date },

    refreshTokens: { type: [refreshTokenSchema], default: [], select: false },

    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },

    stats: { type: statsSchema, default: () => ({}) },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpires;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ───────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ firebaseUid: 1 });

// ── Hash password before save ─────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

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

// ── Instance method: compare password ─────────────────────
userSchema.methods.comparePassword = function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password as string);
};

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export default User;
