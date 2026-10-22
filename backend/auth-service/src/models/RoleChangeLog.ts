import mongoose, { Schema, Model, Document, Types } from 'mongoose';

// Append-only record of every role grant/revoke made by an admin.
export interface IRoleChangeLog extends Document {
  userId:    Types.ObjectId;
  actorId:   Types.ObjectId;
  fromRole:  string;
  toRole:    string;
  reason:    string;
  createdAt: Date;
}

const RoleChangeLogSchema = new Schema<IRoleChangeLog>(
  {
    userId:   { type: Schema.Types.ObjectId, required: true },
    actorId:  { type: Schema.Types.ObjectId, required: true },
    fromRole: { type: String, required: true },
    toRole:   { type: String, required: true },
    reason:   { type: String, required: true, maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
RoleChangeLogSchema.index({ userId: 1, createdAt: -1 });

const RoleChangeLog: Model<IRoleChangeLog> = mongoose.model<IRoleChangeLog>('RoleChangeLog', RoleChangeLogSchema);
export default RoleChangeLog;
