import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IWorkOrder extends Document {
  workOrderCode: string;
  clientId: Types.ObjectId;
  teamId?: Types.ObjectId;
  categoryId: Types.ObjectId;
  status: 'Open' | 'Assigned' | 'InProgress' | 'PendingReview' | 'Closed' | 'Flagged';
  locationAddress: string;
  locationLat: number;
  locationLng: number;
  description: string;
  urgency: 'Low' | 'Medium' | 'High';
  preferredTime?: string;
  beforeImageUrl?: string;
  afterImageUrl?: string;
  isWasteCategory: boolean;
  wasteType?: string;
  wasteQuantityKg?: number;
  aiConfidenceScore?: number;
  aiResult?: string;
  aiVerificationDetails?: any;
  pdfReportUrl?: string;
  assignedAt?: Date;
  startedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const workOrderSchema = new Schema<IWorkOrder>(
  {
    workOrderCode: { type: String, required: true, unique: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'FieldTeam' },
    categoryId: { type: Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
    status: {
      type: String,
      enum: ['Open', 'Assigned', 'InProgress', 'PendingReview', 'Closed', 'Flagged'],
      required: true,
      default: 'Open',
    },
    locationAddress: { type: String, required: true },
    locationLat: { type: Number, required: true },
    locationLng: { type: Number, required: true },
    description: { type: String, required: true },
    urgency: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
    preferredTime: { type: String },
    beforeImageUrl: { type: String },
    afterImageUrl: { type: String },
    isWasteCategory: { type: Boolean, default: false },
    wasteType: { type: String },
    wasteQuantityKg: { type: Number },
    aiConfidenceScore: { type: Number },
    aiResult: { type: String },
    aiVerificationDetails: { type: Schema.Types.Mixed },
    pdfReportUrl: { type: String },
    assignedAt: { type: Date },
    startedAt: { type: Date },
    closedAt: { type: Date },
  },
  { timestamps: true }
);

workOrderSchema.index({ clientId: 1, status: 1 });
workOrderSchema.index({ teamId: 1, status: 1 });
workOrderSchema.index({ categoryId: 1 });
workOrderSchema.index({ status: 1 });

export const WorkOrder = mongoose.model<IWorkOrder>('WorkOrder', workOrderSchema);
