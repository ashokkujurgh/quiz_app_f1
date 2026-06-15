import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email:    string;
  avatar:   string | null;
}

const UserSchema = new Schema<IUser>(
  { username: String, email: String, avatar: { type: String, default: null } },
  { strict: false, timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema, 'users');
