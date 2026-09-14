import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import * as chatService from '../services/chat.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const getMessages = async (req: AuthRequest, res: Response) => {
  const messages = await chatService.getMessages(req.params.workOrderId as string);
  res.json(ApiResponse.success(messages, 'Messages retrieved successfully'));
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId || '';
  const role = (req.user?.role || 'Client') as 'Client' | 'FieldTeam';
  const msg = await chatService.sendMessage(req.params.workOrderId as string, userId, role, req.body.message);
  res.status(201).json(ApiResponse.created(msg, 'Message sent successfully'));
};
