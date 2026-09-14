import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import * as notifService from '../services/notification.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const getAll = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId || '';
  const notifs = await notifService.getByUser(userId);
  res.json(ApiResponse.success(notifs, 'Notifications retrieved successfully'));
};

export const markRead = async (req: AuthRequest, res: Response) => {
  const notif = await notifService.markRead(req.params.id as string);
  res.json(ApiResponse.success(notif, 'Notification marked read'));
};

export const markAllRead = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId || '';
  await notifService.markAllRead(userId);
  res.json(ApiResponse.success(null, 'All notifications marked as read'));
};
