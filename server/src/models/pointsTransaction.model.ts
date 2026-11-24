export type PointsTransactionType =
  | 'InitialGrant'
  | 'JobWonDeduction'
  | 'JobCancellationRefund'
  | 'BonusReward'
  | 'AdminAdjustment';

export interface IPointsTransaction {
  _id?: string;
  id?: string;
  userId: string;
  workOrderId?: string;
  type: PointsTransactionType;
  pointsChange: number;
  balanceAfter: number;
  reason: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}
