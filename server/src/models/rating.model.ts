import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IRating extends Document {
  workOrderId: Types.ObjectId;
  clientId: Types.ObjectId;
  teamId: Types.ObjectId;
  stars: number;
  comment?: string;
  ratedAt: Date;
}

const ratingSchema = new Schema<IRating>({
  workOrderId: { type: Schema.Types.ObjectId, ref: 'WorkOrder', required: true, unique: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  teamId: { type: Schema.Types.ObjectId, ref: 'FieldTeam', required: true },
  stars: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  ratedAt: { type: Date, required: true },
});

export const Rating = mongoose.model<IRating>('Rating', ratingSchema);
