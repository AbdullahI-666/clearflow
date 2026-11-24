export interface IFieldTeam {
  _id?: string;
  id?: string;
  name: string;
  categoryId?: any;
  members?: string[];
  zoneLat: number;
  zoneLng: number;
  zoneRadiusKm?: number;
  isActive?: boolean;
  averageRating?: number;
  totalJobsCompleted?: number;
  activeOrderCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
