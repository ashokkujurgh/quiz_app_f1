import mongoose, { Document, Schema, Types } from 'mongoose';

// Append-only record of privileged actions (admin grants, revokes, manual reconciles, …).
export interface IAuditLog extends Document {
  actorId:    Types.ObjectId | null;   // null = system job
  actorRole:  string;
  action:     string;
  targetType: string;
  targetId:   string;
  details:    Record<string, unknown>;
  createdAt:  Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId:    { type: Schema.Types.ObjectId, default: null },
    actorRole:  { type: String, required: true },
    action:     { type: String, required: true },
    targetType: { type: String, required: true },
    targetId:   { type: String, required: true },
    details:    { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
