export interface ISettings {
  _id?: string;
  id?: string;
  aiConfidenceThreshold: number;
  gpsIntervalSeconds: number;
  maxActiveOrdersPerTeam: number;
  maxFailedLoginAttempts: number;
  defaultCurrency: string;
  slaTargetHours: number;
  autoDispatchEnabled: boolean;
  smtpHost?: string;
  smtpUser?: string;
  smtpPort?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
