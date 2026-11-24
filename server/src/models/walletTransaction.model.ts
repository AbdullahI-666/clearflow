export type WalletTransactionType =
  | 'JobEarning'
  | 'AdminCommission'
  | 'BonusReward'
  | 'Withdrawal'
  | 'WithdrawalRefund'
  | 'Adjustment';

export interface IWalletTransaction {
  _id?: string;
  id?: string;
  userId: string;
  workOrderId?: string;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  status: 'Pending' | 'Completed' | 'Rejected';
  withdrawalDetails?: {
    method?: string;
    accountInfo?: string;
    approvedBy?: string;
    rejectionReason?: string;
    processedAt?: Date;
  };
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}
