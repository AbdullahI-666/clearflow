import mongoose, { Schema } from 'mongoose';

export interface IUser {
  _id?: mongoose.Types.ObjectId | string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'Client' | 'FieldTeam' | 'Admin';
  phone: string;
  isVerified: boolean;
  isActive: boolean;
  failedLoginAttempts: number;
  accountLockedUntil?: Date;
  verificationToken?: string;
  verificationTokenExpiry?: Date;
  resetPasswordToken?: string;
  resetPasswordExpiry?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['Client', 'FieldTeam', 'Admin'], required: true },
    phone: { type: String, required: true, trim: true },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    failedLoginAttempts: { type: Number, default: 0 },
    accountLockedUntil: { type: Date },
    verificationToken: { type: String },
    verificationTokenExpiry: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpiry: { type: Date },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', userSchema);
