import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IGpsLog extends Document {
  teamId: Types.ObjectId;
  workOrderId?: Types.ObjectId;
  lat: number;
  lng: number;
  accuracyMeters?: number;
  recordedAt: Date;
}

const gpsLogSchema = new Schema<IGpsLog>({
  teamId: { type: Schema.Types.ObjectId, ref: 'FieldTeam', required: true },
  workOrderId: { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  accuracyMeters: { type: Number },
  recordedAt: { type: Date, required: true },
});

gpsLogSchema.index({ teamId: 1, recordedAt: 1 });

export const GpsLog = mongoose.model<IGpsLog>('GpsLog', gpsLogSchema);
