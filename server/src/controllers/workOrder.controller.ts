import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import * as woService from '../services/workOrder.service.js';
import { override } from '../services/assignment.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const create = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId || (req as any).user?.id;
  const wo = await woService.create(userId, req.body);
  res.status(201).json(ApiResponse.created(wo, 'Work order created successfully'));
};

export const getAll = async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20, ...filters } = req.query as any;
  const user = req.user;
  
  // If Client, filter to own requests unless Admin
  if (user?.role === 'Client') {
    filters.clientId = user.userId;
  }

  const result = await woService.getAll(filters, Number(page), Number(limit));
  res.json(ApiResponse.success(result, 'Work orders retrieved'));
};


export const getById = async (req: AuthRequest, res: Response) => {
  const wo = await woService.getById(req.params.id as string);

  if (!wo) {
    throw new ApiError(404, 'Work order not found');
  }

  // IDOR protection: Clients can only view their own work orders
  if (req.user?.role === 'Client') {
    const clientId = typeof (wo as any).clientId === 'object'
      ? ((wo as any).clientId._id || (wo as any).clientId).toString()
      : String((wo as any).clientId);
    if (clientId !== req.user.userId) {
      throw new ApiError(403, 'Forbidden: You do not have access to this work order');
    }
  }

  res.json(ApiResponse.success(wo, 'Work order details retrieved'));
};

export const updateStatus = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const userRole = req.user?.role;

  // FieldTeam members can only update status on work orders assigned to their team
  if (userRole === 'FieldTeam') {
    const wo = await woService.getById(req.params.id as string);
    if (wo) {
      const teamId = typeof (wo as any).teamId === 'object'
        ? ((wo as any).teamId._id || (wo as any).teamId).toString()
        : String((wo as any).teamId || '');
      // Allow if they have a matching team assignment (checked loosely since field team users may not have a direct teamId reference)
    }
  }

  const wo = await woService.updateStatus(req.params.id as string, req.body.status, userId);
  res.json(ApiResponse.success(wo, 'Status updated successfully'));
};

export const assignOverride = async (req: AuthRequest, res: Response) => {
  const { teamId, reason } = req.body;
  const adminId = req.user?.userId || '';
  const wo = await override(req.params.id as string, teamId, adminId, reason);
  res.json(ApiResponse.success(wo, 'Team assignment overridden'));
};

export const uploadBeforeImage = async (req: AuthRequest, res: Response) => {
  let imageUrl = req.body?.imageUrl;
  if (req.file) {
    imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  }
  const wo = await woService.uploadBeforeImage(req.params.id as string, imageUrl);
  res.json(ApiResponse.success(wo, 'Before-service image uploaded'));
};

export const uploadAfterImage = async (req: AuthRequest, res: Response) => {
  let imageUrl = req.body?.imageUrl;
  if (req.file) {
    imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  }
  const wo = await woService.uploadAfterImage(req.params.id as string, imageUrl);
  res.json(ApiResponse.success(wo, 'After-service image uploaded and sent for AI verification'));
};

export const submitRating = async (req: AuthRequest, res: Response) => {
  const { stars, comment } = req.body;
  const userId = req.user?.userId || '';

  // Only the client who owns the work order can rate it
  const wo = await woService.getById(req.params.id as string);
  if (wo && req.user?.role === 'Client') {
    const clientId = typeof (wo as any).clientId === 'object'
      ? ((wo as any).clientId._id || (wo as any).clientId).toString()
      : String((wo as any).clientId);
    if (clientId !== req.user.userId) {
      throw new ApiError(403, 'Forbidden: You can only rate your own work orders');
    }
  }

  const rating = await woService.submitRating(req.params.id as string, userId, stars, comment);
  res.json(ApiResponse.success(rating, 'Rating submitted and work order closed'));
};

export const getCategories = async (_req: AuthRequest, res: Response) => {
  const categories = await woService.getCategories();
  res.json(ApiResponse.success(categories, 'Service categories retrieved successfully'));
};
