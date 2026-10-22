import mongoose, { Schema, Model, Document, Types } from 'mongoose';

// Automatic screening of one submitted revision. Advice for the human reviewer only — it never
// approves, rejects or counts as a violation. Never shown publicly or to the creator.
export type ScreeningStatus = 'completed' | 'error' | 'skipped';
export type RecommendedAction = 'approve' | 'review' | 'reject';

export interface IScreeningOutput {
  relevant:           boolean;
  quality_score:      number;          // 0–100
  reasons:            string[];
  recommended_action: RecommendedAction;
  flags: {
    title_ok:             boolean;
    length_ok:            boolean;
    spam_or_stuffing:     boolean;
    misleading_or_unsafe: boolean;
    likely_copied:        boolean;
    promotional:          boolean;
    suspicious_links:     boolean;
    view_manipulation:    boolean;
    image_relevant:       boolean | null;
  };
}

export interface IHeuristics {
  wordCount:        number;
  linkCount:        number;
  suspiciousLinks:  string[];
  promoMatches:     string[];
  viewBaitMatches:  string[];
  topWordShare:     number;
  capsRatio:        number;
  repeatedParagraphs: number;
  duplicateOf:      string | null;   // revision id with identical text by another creator
  flags:            string[];        // short machine-readable list of what tripped
}

export interface IValidationResult extends Document {
  _id:           Types.ObjectId;
  revisionId:    Types.ObjectId;
  premiumPostId: Types.ObjectId;
  creatorId:     Types.ObjectId;
  status:        ScreeningStatus;
  errorCode:     'not_configured' | 'timeout' | 'provider_error' | 'malformed_output' | null;
  llmModel:      string | null;
  durationMs:    number;
  attempts:      number;
  output:        IScreeningOutput | null;
  heuristics:    IHeuristics;
  createdAt:     Date;
  updatedAt:     Date;
}

const ValidationResultSchema = new Schema<IValidationResult>(
  {
    revisionId:    { type: Schema.Types.ObjectId, required: true, unique: true },
    premiumPostId: { type: Schema.Types.ObjectId, required: true },
    creatorId:     { type: Schema.Types.ObjectId, required: true },
    status:        { type: String, enum: ['completed', 'error', 'skipped'], required: true },
    errorCode:     { type: String, default: null },
    llmModel:      { type: String, default: null },
    durationMs:    { type: Number, default: 0 },
    attempts:      { type: Number, default: 1 },
    output:        { type: Schema.Types.Mixed, default: null },
    heuristics:    { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

const ValidationResult: Model<IValidationResult> = mongoose.model<IValidationResult>('ValidationResult', ValidationResultSchema);
export default ValidationResult;
