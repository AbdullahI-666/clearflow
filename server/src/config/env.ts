import dotenv from 'dotenv';
dotenv.config();

const isProd = process.env.NODE_ENV === 'production';
if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fallback_secret_key_clearflow_2026')) {
  console.error('CRITICAL SECURITY ERROR: JWT_SECRET must be set to a secure secret in production!');
  process.exit(1);
}

export const env = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret_key_clearflow_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  NODE_ENV: process.env.NODE_ENV || 'development',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:5001',
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || 'getclearflow@gmail.com',
  BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME || 'ClearFlow',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'ClearFlow System <getclearflow@gmail.com>',
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  DATABASE_URL: process.env.DATABASE_URL || '',
  SUPABASE_DB_POOLER_URL: process.env.SUPABASE_DB_POOLER_URL || '',
  SUPABASE_DB_PASSWORD: process.env.SUPABASE_DB_PASSWORD || '',
  SCHEDULER_ENABLED: process.env.SCHEDULER_ENABLED !== 'false',
  TIMEZONE: process.env.TIMEZONE || 'UTC',
  // Official OAuth 2.0 Credentials
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/auth/callback/google',
  APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID || '',
  APPLE_TEAM_ID: process.env.APPLE_TEAM_ID || '',
  APPLE_KEY_ID: process.env.APPLE_KEY_ID || '',
  APPLE_PRIVATE_KEY: process.env.APPLE_PRIVATE_KEY || '',
  APPLE_REDIRECT_URI: process.env.APPLE_REDIRECT_URI || 'http://localhost:5173/auth/callback/apple',
};

export const ENV = env;
