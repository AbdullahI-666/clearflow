export type OfferStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Countered' | 'Cancelled';

export interface IMarketplaceOffer {
  _id?: string;
  id?: string;
  workOrderId: string;
  technicianId: string;
  teamId?: string;
  technicianName: string;
  technicianPhone?: string;
  technicianRating: number;
  technicianJobsCompleted: number;
  offerPrice: number;
  proposedEtaMinutes: number;
  distanceKm: number;
  message?: string;
  counterPrice?: number;
  counterMessage?: string;
  status: OfferStatus;
  pointsCommitted: number;
  acceptedAt?: Date;
  rejectedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
