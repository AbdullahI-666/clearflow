export interface IWorkOrder {
  _id?: string;
  id?: string;
  workOrderCode: string;
  title?: string;
  clientId: any;
  teamId?: any;
  categoryId: any;
  status: 
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
  locationAddress: string;
  locationLat: number;
  locationLng: number;
  description: string;
  urgency: 'Low' | 'Medium' | 'High';
  preferredTime?: string;
  beforeImageUrl?: string;
  afterImageUrl?: string;
  beforeImages?: string[];
  afterImages?: string[];
  clientFeedback?: {
    rating?: number;
    comment?: string;
    satisfaction?: 'Approved' | 'ChangesRequested';
    submittedAt?: Date;
    clientName?: string;
  };
  adminInspection?: {
    inspectedAt?: Date;
    inspectedBy?: string;
    status?: 'Passed' | 'Flagged' | 'Pending';
    notes?: string;
    aiConfidenceScore?: number;
    aiResult?: string;
    metrics?: any;
  };
  progressPercentage?: number;
  progressStage?: string;
  budget?: number;
  marketplaceStatus?: 'Draft' | 'Bidding' | 'Assigned' | 'InProgress' | 'Completed' | 'Settled' | 'Cancelled';
  trackingStage?: 'RequestCreated' | 'OffersReceived' | 'MemberSelected' | 'Assigned' | 'OnTheWay' | 'Arrived' | 'WorkStarted' | 'Work25' | 'Work50' | 'Work75' | 'Work100' | 'Completed' | 'PaymentSettled';
  selectedOfferId?: string;
  offersCount?: number;
  settlementDetails?: {
    agreedPrice: number;
    adminCommission: number;
    technicianPayout: number;
    settledAt: Date;
    bonusEarned?: number;
  };
  cancellationReason?: string;
  isWasteCategory?: boolean;
  wasteType?: string;
  wasteQuantityKg?: number;
  isAccepted?: boolean;
  acceptedAt?: Date;
  acceptedBy?: string;
  rejectionReason?: string;
  isWorkersBusy?: boolean;
  workerQueueReason?: string;
  aiConfidenceScore?: number;
  aiResult?: string;
  aiVerificationDetails?: any;
  pdfReportUrl?: string;
  assignedAt?: Date;
  startedAt?: Date;
  closedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
