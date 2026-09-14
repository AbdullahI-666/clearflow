import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import * as authService from '../services/auth.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const register = async (req: Request, res: Response) => {
  const { name, email, password, role, phone } = req.body;
  const result = await authService.register(name, email, password, role, phone);
  res.status(201).json(ApiResponse.created(result, result.message || 'Registration successful'));
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.json(ApiResponse.success(result, 'Login successful'));
};

export const getMe = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId || '';
  const user = await authService.getMe(userId);
  res.json(ApiResponse.success(user, 'User profile retrieved successfully'));
};

export const verifyEmail = async (req: Request, res: Response) => {
  const result = await authService.verifyEmail(req.params.token as string);
  res.json(ApiResponse.success(result, result.message || 'Email verified successfully'));
};

export const forgotPassword = async (req: Request, res: Response) => {
  const result = await authService.forgotPassword(req.body.email);
  res.json(ApiResponse.success(null, result.message));
};

export const resetPassword = async (req: Request, res: Response) => {
  const newPass = req.body.password || req.body.newPassword;
  const result = await authService.resetPassword(req.params.token as string, newPass);
  res.json(ApiResponse.success(null, result.message || 'Password reset successful'));
};
