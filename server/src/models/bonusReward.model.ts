export type BonusType =
  | 'HighRating'
  | 'AiQuality'
  | 'Punctuality'
  | 'DailyMilestone'
  | 'WeeklyMilestone';

export interface IBonusReward {
  _id?: string;
  id?: string;
  userId: string;
  workOrderId?: string;
  bonusType: BonusType;
  amountCash: number;
  pointsAwarded: number;
  idempotencyKey: string;
  reason: string;
  createdAt: Date;
}
