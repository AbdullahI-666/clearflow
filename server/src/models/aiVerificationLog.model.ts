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
  metrics?: {
    structuralDifference: number;
    cleanlinessImprovement: number;
    ssim: number;
    clarityScore: number;
    fraudRiskScore: number;
    colorShift: number;
  };
  fraudAnalysis?: {
    isDuplicate: boolean;
    identicalImage: boolean;
    hashDifference: number;
    fraudAlert: boolean;
    status: string;
  };
  qualityAssessment?: {
    beforeClarity: number;
    afterClarity: number;
    blurDetected: boolean;
    adequateLighting: boolean;
    qualityRating: string;
  };
  findings?: string[];
  serviceRecommendation?: string;
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
  metrics: {
    structuralDifference: { type: Number },
    cleanlinessImprovement: { type: Number },
    ssim: { type: Number },
    clarityScore: { type: Number },
    fraudRiskScore: { type: Number },
    colorShift: { type: Number },
  },
  fraudAnalysis: {
    isDuplicate: { type: Boolean },
    identicalImage: { type: Boolean },
    hashDifference: { type: Number },
    fraudAlert: { type: Boolean },
    status: { type: String },
  },
  qualityAssessment: {
    beforeClarity: { type: Number },
    afterClarity: { type: Number },
    blurDetected: { type: Boolean },
    adequateLighting: { type: Boolean },
    qualityRating: { type: String },
  },
  findings: [{ type: String }],
  serviceRecommendation: { type: String },
});

export const AiVerificationLog = mongoose.model<IAiVerificationLog>('AiVerificationLog', aiVerificationLogSchema);
