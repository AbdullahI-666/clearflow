export interface IFieldMemberWallet {
  _id?: string;
  id?: string;
  userId: string;
  pointsBalance: number;
  isAvailableOnline: boolean;
  walletBalance: number;
  pendingBalance: number;
  withdrawableBalance: number;
  totalEarnings: number;
  totalCommissionPaid: number;
  searchRadiusKm: number;
  currentLat?: number;
  currentLng?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
