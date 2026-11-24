import { Request, Response } from 'express';
import { dbQuery } from '../config/db.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { emitSettingsUpdated, emitCompanyUpdated } from '../socket/index.js';

let inMemorySettings: any = {
  _id: '65f000000000000000000999',
  companyName: 'ClearFlow Facilities & Maintenance',
  companyPhone: '+92 42 35889104',
  companyEmail: 'operations@clearflow.pk',
  companyAddress: 'Central Facility Complex, Lahore',
  companyAnnouncement: 'Facility operations active 24/7. Rapid-response teams deployed on standby.',
  serviceAvailability: 'All Services Operational',
  companyLogoUrl: '/logo.svg',
  emergencyContact: '+92 300 4829104',
  aiConfidenceThreshold: 0.75,
  gpsIntervalSeconds: 30,
  maxActiveOrdersPerTeam: 5,
  maxFailedLoginAttempts: 5,
  defaultCurrency: 'PKR',
  slaTargetHours: 4,
  autoDispatchEnabled: true,
  smtpHost: 'smtp.gmail.com',
  smtpUser: 'operations@clearflow.com',
  smtpPort: 587,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const getSettings = async (_req: Request, res: Response) => {
  const rows = await dbQuery('SELECT * FROM settings LIMIT 1');
  if (rows && rows.length > 0) {
    const s = rows[0];
    const mapped = {
      _id: s.id,
      companyName: s.company_name || inMemorySettings.companyName,
      companyPhone: s.company_phone || inMemorySettings.companyPhone,
      companyEmail: s.company_email || inMemorySettings.companyEmail,
      companyAddress: s.company_address || inMemorySettings.companyAddress,
      companyAnnouncement: s.company_announcement || inMemorySettings.companyAnnouncement,
      serviceAvailability: s.service_availability || inMemorySettings.serviceAvailability,
      companyLogoUrl: s.company_logo_url || inMemorySettings.companyLogoUrl,
      emergencyContact: s.emergency_contact || inMemorySettings.emergencyContact,
      aiConfidenceThreshold: Number(s.ai_confidence_threshold ?? inMemorySettings.aiConfidenceThreshold),
      gpsIntervalSeconds: s.gps_interval_seconds ?? inMemorySettings.gpsIntervalSeconds,
      maxActiveOrdersPerTeam: s.max_active_orders_per_team ?? inMemorySettings.maxActiveOrdersPerTeam,
      maxFailedLoginAttempts: s.max_failed_login_attempts ?? inMemorySettings.maxFailedLoginAttempts,
      defaultCurrency: s.default_currency || inMemorySettings.defaultCurrency,
      slaTargetHours: s.sla_target_hours ?? inMemorySettings.slaTargetHours,
      autoDispatchEnabled: s.auto_dispatch_enabled ?? inMemorySettings.autoDispatchEnabled,
      smtpHost: s.smtp_host || inMemorySettings.smtpHost,
      smtpUser: s.smtp_user || inMemorySettings.smtpUser,
      smtpPort: s.smtp_port ?? inMemorySettings.smtpPort,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    };
    return res.json(ApiResponse.success(mapped, 'Settings retrieved successfully'));
  }

  res.json(ApiResponse.success(inMemorySettings, 'Settings retrieved successfully'));
};

export const updateSettings = async (req: Request, res: Response) => {
  Object.assign(inMemorySettings, req.body, { updatedAt: new Date() });

  try {
    const existing = await dbQuery('SELECT id FROM settings LIMIT 1');
    if (existing && existing.length > 0) {
      await dbQuery(
        `UPDATE settings SET
          ai_confidence_threshold = COALESCE($1, ai_confidence_threshold),
          gps_interval_seconds = COALESCE($2, gps_interval_seconds),
          max_active_orders_per_team = COALESCE($3, max_active_orders_per_team),
          max_failed_login_attempts = COALESCE($4, max_failed_login_attempts),
          default_currency = COALESCE($5, default_currency),
          sla_target_hours = COALESCE($6, sla_target_hours),
          auto_dispatch_enabled = COALESCE($7, auto_dispatch_enabled),
          smtp_host = COALESCE($8, smtp_host),
          smtp_user = COALESCE($9, smtp_user),
          smtp_port = COALESCE($10, smtp_port),
          updated_at = NOW()
         WHERE id = $11`,
        [
          req.body.aiConfidenceThreshold,
          req.body.gpsIntervalSeconds,
          req.body.maxActiveOrdersPerTeam,
          req.body.maxFailedLoginAttempts,
          req.body.defaultCurrency,
          req.body.slaTargetHours,
          req.body.autoDispatchEnabled,
          req.body.smtpHost,
          req.body.smtpUser,
          req.body.smtpPort,
          existing[0].id
        ]
      );
    }
  } catch (_) {}

  // Broadcast settings and company updates across all connected portals
  emitSettingsUpdated(inMemorySettings);
  emitCompanyUpdated({
    companyName: inMemorySettings.companyName,
    companyPhone: inMemorySettings.companyPhone,
    companyEmail: inMemorySettings.companyEmail,
    companyAddress: inMemorySettings.companyAddress,
    companyAnnouncement: inMemorySettings.companyAnnouncement,
    serviceAvailability: inMemorySettings.serviceAvailability,
    companyLogoUrl: inMemorySettings.companyLogoUrl,
    emergencyContact: inMemorySettings.emergencyContact,
    slaTargetHours: inMemorySettings.slaTargetHours,
    defaultCurrency: inMemorySettings.defaultCurrency,
  });

  res.json(ApiResponse.success(inMemorySettings, 'Settings updated successfully'));
};

