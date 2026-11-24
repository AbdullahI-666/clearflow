export interface IServiceCategory {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  isPaid?: boolean;
  isWaste?: boolean;
  iconUrl?: string;
  basePrice?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
