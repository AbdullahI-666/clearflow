import dotenv from 'dotenv';
dotenv.config();

const isProd = process.env.NODE_ENV === 'production';
if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fallback_secret_key_clearflow_2026')) {
  console.error('CRITICAL SECURITY ERROR: JWT_SECRET must be set to a secure secret in production!');
  process.exit(1);
}

export const env = {
  PORT: process.env.PORT || 3000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/clearflow',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret_key_clearflow_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  NODE_ENV: process.env.NODE_ENV || 'development',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:5001',
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM || 'ClearFlow System <noreply@clearflow.com>',
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
};

export const ENV = env;
