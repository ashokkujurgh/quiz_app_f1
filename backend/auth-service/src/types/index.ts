import { Request } from 'express';
import { Document, Types } from 'mongoose';

// ── User roles ────────────────────────────────────────────
export type UserRole = 'user' | 'admin';
export type AuthProvider = 'google' | 'firebase';

// ── Refresh token subdocument ─────────────────────────────
export interface IRefreshToken {
  token: string;
  createdAt: Date;
  expiresAt: Date;
  deviceInfo?: string;
}

// ── User stats subdocument ────────────────────────────────
export interface IUserStats {
  friends: number;
  posts: number;
  quizzesTaken: number;
  averageScore: number;
}

// ── Mongoose User document ────────────────────────────────
export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  username?: string;
  email: string;
  avatar?: string;
  coverImage?: string;
  bio?: string;
  role: UserRole;
  authProvider: AuthProvider;
  firebaseUid?: string;
  googleId?: string;
  isEmailVerified: boolean;
  refreshTokens: IRefreshToken[];
  isOnline: boolean;
  lastSeen: Date;
  stats: IUserStats;
  createdAt: Date;
  updatedAt: Date;
}

// ── JWT payload ───────────────────────────────────────────
export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  id: string;
  iat?: number;
  exp?: number;
}

// ── Authenticated Express request ─────────────────────────
export interface AuthRequest extends Request {
  user?: IUser;
}

// ── RabbitMQ event types ──────────────────────────────────
export type AuthEventType =
  | 'user.registered'
  | 'user.logged_in'
  | 'user.logged_out'
  | 'user.avatar_uploaded'
  | 'user.profile_updated';

export interface AuthEvent<T = Record<string, unknown>> {
  event: AuthEventType;
  timestamp: string;
  serviceSource: string;
  data: T;
}

// ── Token pair ────────────────────────────────────────────
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

// ── multer-s3 file extension ──────────────────────────────
export interface MulterS3File extends Express.Multer.File {
  location: string;
  key: string;
  bucket: string;
}
