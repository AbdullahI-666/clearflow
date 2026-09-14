import mongoose, { Document, Schema } from 'mongoose';

export interface IServiceCategory extends Document {
  name: string;
  description: string;
  isPaid: boolean;
  isWaste: boolean;
  iconUrl?: string;
  basePrice: number;
  createdAt: Date;
  updatedAt: Date;
}

const serviceCategorySchema = new Schema<IServiceCategory>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    isPaid: { type: Boolean, default: false },
    isWaste: { type: Boolean, default: false },
    iconUrl: { type: String },
    basePrice: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ServiceCategory = mongoose.model<IServiceCategory>('ServiceCategory', serviceCategorySchema);
