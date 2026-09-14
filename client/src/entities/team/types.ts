export interface FieldTeam {
  _id: string;
  id?: string;
  name: string;
  categoryId: {
    _id: string;
    name: string;
  } | string;
  members: Array<{
    _id: string;
    name: string;
    email: string;
    phone?: string;
  } | string>;
  zoneLat: number;
  zoneLng: number;
  zoneRadiusKm: number;
  isActive: boolean;
  averageRating: number;
  totalJobsCompleted: number;
  activeOrderCount: number;
  createdAt?: string;
}

