export interface IAiVerificationLog {
  _id?: string;
  id?: string;
  workOrderId: string;
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
