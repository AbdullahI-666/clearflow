export enum NotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  WORK_ORDER_UPDATE = 'WORK_ORDER_UPDATE',
  NEW_MESSAGE = 'NEW_MESSAGE',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  linkTo?: string;
  createdAt: string;
}
