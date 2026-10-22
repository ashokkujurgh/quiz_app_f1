import mongoose, { Schema, Model, Document, Types } from 'mongoose';

// Remembers which account last used an anonymous browser id, so a creator who logs out and
// opens their own post from the same browser is still recognised as a self-view (not paid).
export interface IAnonLink extends Document { anonId: string; userId: Types.ObjectId; updatedAt: Date }

const AnonLinkSchema = new Schema<IAnonLink>(
  {
    anonId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);
AnonLinkSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 365 * 86_400 });

const AnonLink: Model<IAnonLink> = mongoose.model<IAnonLink>('AnonLink', AnonLinkSchema);
export default AnonLink;
