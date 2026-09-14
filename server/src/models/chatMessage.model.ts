import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IChatMessage extends Document {
  workOrderId: Types.ObjectId;
  senderId: Types.ObjectId;
  senderRole: 'Client' | 'FieldTeam' | 'Admin';
  message: string;
  isRead: boolean;
  sentAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>({
  workOrderId: { type: Schema.Types.ObjectId, ref: 'WorkOrder', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: { type: String, enum: ['Client', 'FieldTeam', 'Admin'], required: true },
  message: { type: String, required: true, trim: true },
  isRead: { type: Boolean, default: false },
  sentAt: { type: Date, required: true, default: Date.now },
});

chatMessageSchema.index({ workOrderId: 1, sentAt: 1 });

export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);
