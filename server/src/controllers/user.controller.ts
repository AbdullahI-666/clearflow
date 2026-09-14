import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/user.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const getProfile = async (req: Request, res: Response) => {
  const userId = req.params.id || (req as any).user?.id;
  const user = await User.findById(userId).select('-passwordHash');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  res.json(ApiResponse.success(user, 'User profile retrieved'));
};

export const updateProfile = async (req: Request, res: Response) => {
  const targetId = req.params.id;
  const authUser = (req as any).user;

  // Only allow updating self unless Admin
  if (authUser.id !== targetId && authUser.role !== 'Admin') {
    throw new ApiError(403, 'Unauthorized to modify another user profile');
  }

  const { name, phone, currentPassword, newPassword } = req.body;
  const user = await User.findById(targetId).select('+passwordHash');
  
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (name) user.name = name.trim();
  if (phone) user.phone = phone.trim();

  if (newPassword) {
    if (currentPassword && user.passwordHash) {
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        throw new ApiError(400, 'Current password is incorrect');
      }
    }
    user.passwordHash = await bcrypt.hash(newPassword, 12);
  }

  await user.save();

  const sanitized = await User.findById(targetId).select('-passwordHash');
  res.json(ApiResponse.success(sanitized, 'Profile updated successfully'));
};

export const deactivate = async (req: Request, res: Response) => {
  const user = await User.findByIdAndUpdate(
    req.params.id as string,
    { isActive: false },
    { new: true }
  ).select('-passwordHash');
  
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.json(ApiResponse.success(user, 'User deactivated successfully'));
};
