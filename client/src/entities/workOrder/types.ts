export type WorkOrderStatus = 
  | 'Open' 
  | 'Assigned' 
  | 'InProgress' 
  | 'PendingReview' 
  | 'PendingClientConfirmation' 
  | 'RevisionRequired' 
  | 'Completed' 
  | 'Closed' 
  | 'Flagged' 
  | 'Cancelled' 
  | 'Refused' 
  | 'Disputed' 
  | 'Declined';

export interface ServiceCategory {
  _id: string;
  name: string;
  description: string;
  isPaid: boolean;
  isWaste: boolean;
  iconUrl?: string;
  basePrice?: number;
}

export interface WorkOrder {
  _id: string;
  id?: string;
  workOrderCode: string;
  title?: string;
  clientId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  } | string;
  teamId?: {
    _id: string;
    name: string;
    averageRating?: number;
    totalJobsCompleted?: number;
  } | string;
  categoryId: ServiceCategory | string;
  status: WorkOrderStatus;
  locationAddress: string;
  locationLat: number;
  locationLng: number;
  description: string;
  urgency: 'Low' | 'Medium' | 'High';
  budget?: number;
  agreedPrice?: number;
  estimatedPrice?: number;
  selectedOfferPrice?: number;
  actualAmountPaid?: number;
  paymentMethod?: string;
  completionNotes?: string;
  preferredTime?: string;
  pointsToUnlock?: number;
  distanceKm?: number;
  isUnlocked?: boolean;
  hasMyOffer?: boolean;
  beforeImageUrl?: string;
  afterImageUrl?: string;
  beforeImages?: string[];
  afterImages?: string[];
  clientFeedback?: {
    rating?: number;
    comment?: string;
    satisfaction?: 'Approved' | 'ChangesRequested';
    submittedAt?: string;
    clientName?: string;
  };
  adminInspection?: {
    inspectedAt?: string;
    inspectedBy?: string;
    status?: 'Passed' | 'Flagged' | 'Pending';
    notes?: string;
    aiConfidenceScore?: number;
    aiResult?: string;
    metrics?: any;
  };
  progressPercentage?: number;
  progressStage?: string;
  isWasteCategory?: boolean;
  wasteType?: string;
  wasteQuantityKg?: number;
  isAccepted?: boolean;
  acceptedAt?: string;
  acceptedBy?: string;
  rejectionReason?: string;
  aiConfidenceScore?: number;
  aiResult?: string;
  aiVerificationDetails?: AiVerificationDetails;
  pdfReportUrl?: string;
  assignedAt?: string;
  startedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiVerificationDetails {
  confidenceScore: number;
  result: 'Pass' | 'Fail' | 'Flagged';
  modelVersion: string;
  processingTimeMs: number;
  verifiedAt: string;
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

