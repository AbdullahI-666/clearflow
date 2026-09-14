import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IFieldTeam extends Document {
  name: string;
  categoryId: Types.ObjectId;
  members: Types.ObjectId[];
  zoneLat: number;
  zoneLng: number;
  zoneRadiusKm: number;
  isActive: boolean;
  averageRating: number;
  totalJobsCompleted: number;
  activeOrderCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const fieldTeamSchema = new Schema<IFieldTeam>(
  {
    name: { type: String, required: true, trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    zoneLat: { type: Number, required: true },
    zoneLng: { type: Number, required: true },
    zoneRadiusKm: { type: Number, default: 10 },
    isActive: { type: Boolean, default: true },
    averageRating: { type: Number, default: 0 },
    totalJobsCompleted: { type: Number, default: 0 },
    activeOrderCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const FieldTeam = mongoose.model<IFieldTeam>('FieldTeam', fieldTeamSchema);
