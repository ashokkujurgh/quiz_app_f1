import mongoose, { Schema, Model, Document, Types } from 'mongoose';

// Images a creator uploaded (or accepted from AI) after server-side validation. Premium posts may
// only reference these, so a post can't point at an arbitrary external or tracking URL.
export interface IUploadedAsset extends Document {
  _id:       Types.ObjectId;
  ownerId:   Types.ObjectId;
  url:       string;
  key:       string;
  width:     number;
  height:    number;
  bytes:     number;
  mime:      string;
  source:    'upload' | 'ai';
  createdAt: Date;
}

const UploadedAssetSchema = new Schema<IUploadedAsset>(
  {
    ownerId: { type: Schema.Types.ObjectId, required: true },
    url:     { type: String, required: true, unique: true },
    key:     { type: String, required: true },
    width:   { type: Number, required: true },
    height:  { type: Number, required: true },
    bytes:   { type: Number, required: true },
    mime:    { type: String, required: true },
    source:  { type: String, enum: ['upload', 'ai'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

UploadedAssetSchema.index({ ownerId: 1, createdAt: -1 });

const UploadedAsset: Model<IUploadedAsset> = mongoose.model<IUploadedAsset>('UploadedAsset', UploadedAssetSchema);
export default UploadedAsset;
