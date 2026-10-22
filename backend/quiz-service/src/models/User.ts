import mongoose, { Document, Schema } from 'mongoose';

// Read-only mirror of auth-service User — only what invites need
export interface IUser extends Document {
  name:     string;
  username: string;
  avatar:   string | null;
  isActive: boolean;
}

const UserSchema = new Schema<IUser>(
  {
    name:     { type: String },
    username: { type: String },
    avatar:   { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { strict: false, timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema, 'users');
