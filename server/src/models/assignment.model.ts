import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAssignment extends Document {
  workOrderId: Types.ObjectId;
  teamId: Types.ObjectId;
  method: 'Auto' | 'Manual';
  proximityScore?: number;
  workloadScore?: number;
  ratingScore?: number;
  compositeScore?: number;
  overriddenBy?: Types.ObjectId;
  overrideReason?: string;
  assignedAt: Date;
}

const assignmentSchema = new Schema<IAssignment>({
  workOrderId: { type: Schema.Types.ObjectId, ref: 'WorkOrder', required: true, unique: true },
  teamId: { type: Schema.Types.ObjectId, ref: 'FieldTeam', required: true },
  method: { type: String, enum: ['Auto', 'Manual'], required: true },
  proximityScore: { type: Number },
  workloadScore: { type: Number },
  ratingScore: { type: Number },
  compositeScore: { type: Number },
  overriddenBy: { type: Schema.Types.ObjectId, ref: 'User' },
  overrideReason: { type: String },
  assignedAt: { type: Date, required: true },
});

export const Assignment = mongoose.model<IAssignment>('Assignment', assignmentSchema);
