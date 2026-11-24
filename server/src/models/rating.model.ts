export interface IRating {
  _id?: string;
  id?: string;
  workOrderId: string;
  clientId: string;
  teamId: string;
  stars: number;
  comment?: string;
  ratedAt: Date;
}
