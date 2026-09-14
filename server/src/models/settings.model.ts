import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
  aiConfidenceThreshold: number;
  gpsIntervalSeconds: number;
  maxActiveOrdersPerTeam: number;
  maxFailedLoginAttempts: number;
  defaultCurrency: string;
  slaTargetHours: number;
  autoDispatchEnabled: boolean;
  smtpHost?: string;
  smtpUser?: string;
  smtpPort?: number;
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    aiConfidenceThreshold: { type: Number, default: 0.75 },
    gpsIntervalSeconds: { type: Number, default: 30 },
    maxActiveOrdersPerTeam: { type: Number, default: 5 },
    maxFailedLoginAttempts: { type: Number, default: 5 },
    defaultCurrency: { type: String, default: 'USD' },
    slaTargetHours: { type: Number, default: 4 },
    autoDispatchEnabled: { type: Boolean, default: true },
    smtpHost: { type: String },
    smtpUser: { type: String },
    smtpPort: { type: Number },
  },
  { timestamps: true }
);

export const Settings = mongoose.model<ISettings>('Settings', settingsSchema);
