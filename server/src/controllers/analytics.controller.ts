import { Request, Response } from 'express';
import * as analyticsService from '../services/analytics.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const getDashboard = async (req: Request, res: Response) => {
  const { from, to, category } = req.query;
  const data = await analyticsService.getDashboard(from as string, to as string, category as string);
  res.json(ApiResponse.success(data, 'Analytics dashboard data retrieved successfully'));
};

export const getPrediction = async (req: Request, res: Response) => {
  const data = await analyticsService.getPrediction();
  res.json(ApiResponse.success(data, '7-day workload prediction generated successfully'));
};

export const getTeamPerformance = async (req: Request, res: Response) => {
  const { from, to } = req.query;
  const data = await analyticsService.getTeamPerformance(from as string, to as string);
  res.json(ApiResponse.success(data, 'Team performance metrics retrieved successfully'));
};

export const getZoneDemand = async (req: Request, res: Response) => {
  const data = await analyticsService.getZoneDemand();
  res.json(ApiResponse.success(data, 'Zone demand metrics retrieved successfully'));
};

export const exportData = async (req: Request, res: Response) => {
  const { format = 'csv', from, to } = req.query;
  const result = await analyticsService.exportData(format as 'pdf' | 'csv', from as string, to as string);
  res.json(ApiResponse.success(result, 'Export generated successfully'));
};
