import mongoose, { Document, Schema } from 'mongoose';

// Read-only mirror of auth-service User — used for author snapshots and role checks
export interface IUser extends Document {
  name:     string;
  username: string;
  avatar:   string | null;
  role:     string;
  isActive: boolean;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name:     { type: String },
    username: { type: String },
    avatar:   { type: String, default: null },
    role:     { type: String, default: 'user' },
    isActive: { type: Boolean, default: true },
  },
  { strict: false, timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema, 'users');
