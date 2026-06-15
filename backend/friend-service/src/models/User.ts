import mongoose, { Document, Schema } from 'mongoose';

// Read-only mirror of auth-service User — only the fields we need for lookups
export interface IUser extends Document {
  username: string;
  email:    string;
  avatar:   string | null;
  role:     string;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true },
    email:    { type: String, required: true },
    avatar:   { type: String, default: null },
    role:     { type: String, default: 'user' },
  },
  { strict: false, timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema, 'users');
