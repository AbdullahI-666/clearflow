export interface IAssignment {
  _id?: string;
  id?: string;
  workOrderId: string;
  teamId: string;
  method: 'Auto' | 'Manual';
  proximityScore?: number;
  workloadScore?: number;
  ratingScore?: number;
  compositeScore?: number;
  overriddenBy?: string;
  overrideReason?: string;
  assignedAt: Date;
}
