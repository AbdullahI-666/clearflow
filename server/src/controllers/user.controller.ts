import { Response } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { DEMO_USERS, IN_MEMORY_USERS } from '../services/auth.service.js';

export const getProfile = async (req: AuthRequest, res: Response) => {
  const userId = req.params.id || req.user?.userId;

  const demoMatch = DEMO_USERS.find(d => d._id === userId);
  if (demoMatch) {
    return res.json(ApiResponse.success({
      _id: demoMatch._id,
      name: demoMatch.name,
      email: demoMatch.email,
      role: demoMatch.role,
      phone: demoMatch.phone,
      isVerified: true,
      isActive: true,
    }, 'User profile retrieved'));
  }

  const memUser = IN_MEMORY_USERS.find(u => u._id === userId);
  if (memUser) {
    const { passwordHash, ...sanitized } = memUser;
    return res.json(ApiResponse.success(sanitized, 'User profile retrieved'));
  }

  if (mongoose.connection.readyState === 1) {
    try {
      const user = await User.findById(userId).select('-passwordHash');
      if (user) {
        return res.json(ApiResponse.success(user, 'User profile retrieved'));
      }
    } catch (e) {}
  }

  throw new ApiError(404, 'User not found');
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  const targetId = req.params.id;
  const callerId = req.user?.userId;
  const callerRole = req.user?.role;

  // Only allow updating own profile unless Admin
  if (callerId !== targetId && callerRole !== 'Admin') {
    throw new ApiError(403, 'Unauthorized to modify another user profile');
  }

  const { name, phone, currentPassword, newPassword } = req.body;

  // 1. Check demo user
  const demoMatch = DEMO_USERS.find(d => d._id === targetId);
  if (demoMatch) {
    if (name && typeof name === 'string') demoMatch.name = name.trim();
    if (phone && typeof phone === 'string') demoMatch.phone = phone.trim();
    if (newPassword) {
      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        throw new ApiError(400, 'New password must be at least 6 characters long');
      }
      if (callerId === targetId) {
        if (!currentPassword || currentPassword !== demoMatch.password) {
          throw new ApiError(400, 'Current password is incorrect');
        }
      }
      demoMatch.password = newPassword;
    }
    return res.json(ApiResponse.success({
      _id: demoMatch._id,
      name: demoMatch.name,
      email: demoMatch.email,
      role: demoMatch.role,
      phone: demoMatch.phone,
      isVerified: true,
      isActive: true,
    }, 'Profile updated successfully'));
  }

  // 2. Check in-memory registered user
  const memUser = IN_MEMORY_USERS.find(u => u._id === targetId);
  if (memUser) {
    if (name && typeof name === 'string') memUser.name = name.trim();
    if (phone && typeof phone === 'string') memUser.phone = phone.trim();
    if (newPassword) {
      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        throw new ApiError(400, 'New password must be at least 6 characters long');
      }
      if (callerId === targetId) {
        if (!currentPassword) {
          throw new ApiError(400, 'Current password is required to change password');
        }
        const isMatch = await bcrypt.compare(currentPassword, memUser.passwordHash);
        if (!isMatch) {
          throw new ApiError(400, 'Current password is incorrect');
        }
      }
      memUser.passwordHash = await bcrypt.hash(newPassword, 12);
    }
    const { passwordHash, ...sanitized } = memUser;
    return res.json(ApiResponse.success(sanitized, 'Profile updated successfully'));
  }

  // 3. Check MongoDB if connected
  if (mongoose.connection.readyState === 1) {
    try {
      const user = await User.findById(targetId).select('+passwordHash');
      if (user) {
        if (name && typeof name === 'string') user.name = name.trim();
        if (phone && typeof phone === 'string') user.phone = phone.trim();
        if (newPassword) {
          if (typeof newPassword !== 'string' || newPassword.length < 6) {
            throw new ApiError(400, 'New password must be at least 6 characters long');
          }
          if (callerId === targetId) {
            if (!currentPassword) {
              throw new ApiError(400, 'Current password is required to change password');
            }
            if (user.passwordHash) {
              const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
              if (!isMatch) {
                throw new ApiError(400, 'Current password is incorrect');
              }
            }
          }
          user.passwordHash = await bcrypt.hash(newPassword, 12);
        }
        await user.save();
        const sanitized = await User.findById(targetId).select('-passwordHash');
        return res.json(ApiResponse.success(sanitized, 'Profile updated successfully'));
      }
    } catch (e: any) {
      if (e instanceof ApiError) throw e;
    }
  }

  throw new ApiError(404, 'User not found');
};

export const deactivate = async (req: AuthRequest, res: Response) => {
  const targetId = req.params.id as string;

  const demoMatch = DEMO_USERS.find(d => d._id === targetId);
  if (demoMatch) {
    (demoMatch as any).isActive = false;
    return res.json(ApiResponse.success(demoMatch, 'User deactivated successfully'));
  }

  const memUser = IN_MEMORY_USERS.find(u => u._id === targetId);
  if (memUser) {
    memUser.isActive = false;
    const { passwordHash, ...sanitized } = memUser;
    return res.json(ApiResponse.success(sanitized, 'User deactivated successfully'));
  }

  if (mongoose.connection.readyState === 1) {
    const user = await User.findByIdAndUpdate(
      targetId,
      { isActive: false },
      { new: true }
    ).select('-passwordHash');
    
    if (user) {
      return res.json(ApiResponse.success(user, 'User deactivated successfully'));
    }
  }

  throw new ApiError(404, 'User not found');
};
