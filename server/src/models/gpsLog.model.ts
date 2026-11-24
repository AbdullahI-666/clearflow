export interface IGpsLog {
  _id?: string;
  id?: string;
  teamId: string;
  workOrderId?: string;
  lat: number;
  lng: number;
  accuracyMeters?: number;
  recordedAt: Date;
}
