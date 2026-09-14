import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAiVerificationLog extends Document {
  workOrderId: Types.ObjectId;
  beforeImageUrl: string;
  afterImageUrl: string;
  confidenceScore: number;
  result: 'Pass' | 'Fail' | 'Flagged';
  modelVersion: string;
  processingTimeMs?: number;
  verifiedAt: Date;
}

const aiVerificationLogSchema = new Schema<IAiVerificationLog>({
  workOrderId: { type: Schema.Types.ObjectId, ref: 'WorkOrder', required: true, unique: true },
  beforeImageUrl: { type: String, required: true },
  afterImageUrl: { type: String, required: true },
  confidenceScore: { type: Number, required: true, min: 0, max: 1 },
  result: { type: String, enum: ['Pass', 'Fail', 'Flagged'], required: true },
  modelVersion: { type: String, required: true },
  processingTimeMs: { type: Number },
  verifiedAt: { type: Date, required: true },
});

export const AiVerificationLog = mongoose.model<IAiVerificationLog>('AiVerificationLog', aiVerificationLogSchema);
