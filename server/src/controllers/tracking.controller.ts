import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import * as trackingService from '../services/gpsTracking.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const updateLocation = async (req: AuthRequest, res: Response) => {
  const { lat, lng, accuracy, workOrderId, teamId } = req.body;
  const targetTeamId = teamId || req.user?.userId || '';
  const log = await trackingService.updateLocation(targetTeamId, lat, lng, accuracy, workOrderId);
  res.json(ApiResponse.success(log, 'Location updated successfully'));
};

export const getAllPositions = async (req: AuthRequest, res: Response) => {
  const positions = await trackingService.getAllActivePositions();
  res.json(ApiResponse.success(positions, 'Positions retrieved successfully'));
};

export const getTeamPosition = async (req: AuthRequest, res: Response) => {
  const position = await trackingService.getLatestPosition(req.params.teamId as string);
  res.json(ApiResponse.success(position, 'Team position retrieved successfully'));
};
