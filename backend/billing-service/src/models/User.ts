import mongoose, { Document, Schema, Types } from 'mongoose';

// Read-only mirror of auth-service User — only the fields billing needs.
// Roles are always read from here (never trusted from the JWT) so a revoked role takes effect at once.
export interface IUser extends Document {
  _id:      Types.ObjectId;
  name:     string;
  username: string;
  email:    string;
  role:     string;
  isActive: boolean;
}

const UserSchema = new Schema<IUser>(
  {
    name:     { type: String },
    username: { type: String },
    email:    { type: String },
    role:     { type: String, default: 'user' },
    isActive: { type: Boolean, default: true },
  },
  { strict: false, timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema, 'users');
