import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Settings } from '../models/settings.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';

let inMemorySettings: any = {
  _id: '65f000000000000000000999',
  aiConfidenceThreshold: 0.75,
  gpsIntervalSeconds: 30,
  maxActiveOrdersPerTeam: 5,
  maxFailedLoginAttempts: 5,
  defaultCurrency: 'USD',
  slaTargetHours: 4,
  autoDispatchEnabled: true,
  smtpHost: 'smtp.gmail.com',
  smtpUser: 'operations@clearflow.com',
  smtpPort: 587,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const getSettings = async (_req: Request, res: Response) => {
  if (mongoose.connection.readyState === 1) {
    try {
      let settings = await Settings.findOne();
      if (!settings) {
        settings = await Settings.create(inMemorySettings);
      }
      return res.json(ApiResponse.success(settings, 'Settings retrieved successfully'));
    } catch (err) {}
  }

  res.json(ApiResponse.success(inMemorySettings, 'Settings retrieved successfully'));
};

export const updateSettings = async (req: Request, res: Response) => {
  Object.assign(inMemorySettings, req.body, { updatedAt: new Date() });

  if (mongoose.connection.readyState === 1) {
    try {
      let settings = await Settings.findOne();
      if (!settings) {
        settings = await Settings.create(req.body);
      } else {
        Object.assign(settings, req.body);
        await settings.save();
      }
      return res.json(ApiResponse.success(settings, 'Settings updated successfully'));
    } catch (err) {}
  }

  res.json(ApiResponse.success(inMemorySettings, 'Settings updated successfully'));
};
