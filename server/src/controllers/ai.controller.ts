import { Request, Response } from 'express';
import * as aiService from '../services/ai.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const verifyImageQuality = async (req: Request, res: Response) => {
  const { workOrderId, beforeUrl, afterUrl, threshold } = req.body;

  if (!beforeUrl && !afterUrl && !workOrderId) {
    throw new ApiError(400, 'Must provide beforeUrl and afterUrl, or a workOrderId');
  }

  const result = await aiService.verifyServiceQuality(
    workOrderId,
    beforeUrl,
    afterUrl,
    threshold ? Number(threshold) : undefined
  );

  res.json(ApiResponse.success(result, 'AI visual verification completed'));
};

export const getWorkloadForecast = async (_req: Request, res: Response) => {
  const forecast = await aiService.generateWorkloadForecast();
  res.json(ApiResponse.success(forecast, '7-Day predictive workload forecast generated'));
};

export const getDispatchRankings = async (req: Request, res: Response) => {
  const { id } = req.params;
  const rankings = await aiService.calculateDispatchRankings(id as string);
  res.json(ApiResponse.success(rankings, 'Smart dispatch candidate rankings computed'));
};

export const getAnomalies = async (_req: Request, res: Response) => {
  const anomalies = await aiService.detectWorkOrderAnomalies();
  res.json(ApiResponse.success(anomalies, 'Operational anomalies and outliers scanned'));
};

export const estimateWaste = async (req: Request, res: Response) => {
  const { wasteType, weightKg, deviceDescription } = req.body;

  if (!wasteType) {
    throw new ApiError(400, 'Waste type is required');
  }

  const impact = aiService.estimateWasteEnvironmentalImpact(
    wasteType,
    Number(weightKg) || 0,
    deviceDescription
  );

  res.json(ApiResponse.success(impact, 'Environmental impact and recyclability computed'));
};
