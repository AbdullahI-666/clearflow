export type WorkOrderStatus = 'Open' | 'Assigned' | 'InProgress' | 'PendingReview' | 'Closed' | 'Flagged';

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
  preferredTime?: string;
  beforeImageUrl?: string;
  afterImageUrl?: string;
  isWasteCategory?: boolean;
  wasteType?: string;
  wasteQuantityKg?: number;
  aiConfidenceScore?: number;
  aiResult?: string;
  pdfReportUrl?: string;
  assignedAt?: string;
  startedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

