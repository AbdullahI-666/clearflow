import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { scheduler } from '../services/scheduler.service.js';
import { testPgConnectivity } from '../config/supabase.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const getStatus = async (_req: AuthRequest, res: Response) => {
  const status = scheduler.getStatus();
  const dbConnectivity = await testPgConnectivity();
  res.json(ApiResponse.success({
    ...status,
    database: dbConnectivity,
  }, 'Scheduler and background automation status retrieved'));
};

export const triggerJob = async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  try {
    const result = await scheduler.executeJobWithLock(id, true);
    res.json(ApiResponse.success(result, `Job '${id}' executed successfully`));
  } catch (err: any) {
    throw new ApiError(400, err.message);
  }
};

export const toggleJob = async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const { enabled } = req.body;
  try {
    const updated = scheduler.toggleJob(id, Boolean(enabled));
    res.json(ApiResponse.success({
      id: updated.id,
      enabled: updated.enabled,
      cronExpression: updated.cronExpression,
    }, `Job '${id}' enabled status set to ${updated.enabled}`));
  } catch (err: any) {
    throw new ApiError(400, err.message);
  }
};
