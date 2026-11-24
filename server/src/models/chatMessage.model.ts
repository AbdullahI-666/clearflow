export interface IChatMessage {
  _id?: string;
  id?: string;
  workOrderId: string;
  senderId: string;
  senderRole: 'Client' | 'FieldTeam' | 'Admin';
  message: string;
  isRead: boolean;
  sentAt: Date;
}
