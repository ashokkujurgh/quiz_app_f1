import mongoose, { Document, Schema, Types } from 'mongoose';

// A user who applied as a creator. Being a creator *right now* also needs an active
// Creator Premium plan; the profile (and all history) stays when the plan lapses.
export interface ICreatorProfile extends Document {
  _id:                  Types.ObjectId;
  userId:               Types.ObjectId;
  displayName:          string;
  bio:                  string;
  status:               'active' | 'suspended';
  statusReason:         string | null;
  guidelinesVersion:    string;
  acceptedGuidelinesAt: Date;
  createdAt:            Date;
  updatedAt:            Date;
}

const CreatorProfileSchema = new Schema<ICreatorProfile>(
  {
    userId:               { type: Schema.Types.ObjectId, required: true, unique: true },
    displayName:          { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    bio:                  { type: String, trim: true, maxlength: 300, default: '' },
    status:               { type: String, enum: ['active', 'suspended'], default: 'active' },
    statusReason:         { type: String, default: null },
    guidelinesVersion:    { type: String, required: true },
    acceptedGuidelinesAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICreatorProfile>('CreatorProfile', CreatorProfileSchema);
