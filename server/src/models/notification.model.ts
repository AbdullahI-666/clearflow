export type NotificationType =
  | 'NewRequest'
  | 'NewAssignment'
  | 'StatusUpdate'
  | 'ProgressUpdate'
  | 'BeforePhotoUploaded'
  | 'AiInspectionCompleted'
  | 'JobCompleted'
  | 'InvoiceIssued'
  | 'PaymentReceived'
  | 'RatingPrompt'
  | 'ReInspection'
  | 'Broadcast'
  | 'MarketplaceOffer'
  | 'OfferAccepted'
  | 'OfferRejected'
  | 'PointsDeducted'
  | 'PointsRefunded'
  | 'BonusAwarded'
  | 'WithdrawalRequest'
  | 'WithdrawalApproved'
  | 'WithdrawalRejected'
  | 'AdminInspectionCompleted'
  | 'ClientPhotoFeedback'
  | 'JobConfirmed'
  | 'RevisionRequested'
  | 'WorkCompletedPendingConfirmation';

export interface INotification {
  _id?: string;
  id?: string;
  userId: string;
  workOrderId?: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  channel: 'Push' | 'Email' | 'Both';
  deliveryStatus: 'Pending' | 'Delivered' | 'Failed';
  retryCount?: number;
  metadata?: Record<string, any>;
  sentAt: Date;
}
