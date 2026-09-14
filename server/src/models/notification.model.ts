import mongoose, { Document, Schema, Types } from 'mongoose';

export interface INotification extends Document {
  userId: Types.ObjectId;
  workOrderId?: Types.ObjectId;
  type: 'NewAssignment' | 'StatusUpdate' | 'RatingPrompt' | 'ReInspection' | 'Broadcast';
  title: string;
  message: string;
  isRead: boolean;
  channel: 'Push' | 'Email' | 'Both';
  deliveryStatus: 'Pending' | 'Delivered' | 'Failed';
  retryCount: number;
  sentAt: Date;
}

const notificationSchema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  workOrderId: { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
  type: { 
    type: String, 
    enum: ['NewAssignment', 'StatusUpdate', 'RatingPrompt', 'ReInspection', 'Broadcast'], 
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  channel: { type: String, enum: ['Push', 'Email', 'Both'], required: true },
  deliveryStatus: { type: String, enum: ['Pending', 'Delivered', 'Failed'], default: 'Pending' },
  retryCount: { type: Number, default: 0 },
  sentAt: { type: Date, required: true },
});

notificationSchema.index({ userId: 1, isRead: 1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
