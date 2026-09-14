import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// Create Nodemailer transport if SMTP is configured
const getTransporter = () => {
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE, // true for 465, false for other ports (587, 25)
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return null;
};

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  const { to, subject, text, html } = options;

  // 1. Check Nodemailer SMTP Transport
  const transporter = getTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject,
        text,
        html,
      });
      console.log(`✉️  [SMTP] Live email successfully dispatched to ${to} (MsgID: ${info.messageId})`);
      return true;
    } catch (err: any) {
      console.warn(`⚠️  [SMTP] Delivery error to ${to}: ${err.message}`);
    }
  }

  // 2. Check SendGrid HTTP API if SendGrid Key is provided
  if (env.SENDGRID_API_KEY && env.SENDGRID_API_KEY.startsWith('SG.')) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: 'noreply@clearflow.com', name: 'ClearFlow System' },
          subject,
          content: [
            { type: 'text/plain', value: text },
            { type: 'text/html', value: html },
          ],
        }),
      });

      if (response.ok) {
        console.log(`✉️  [SendGrid] Live email dispatched to ${to} (${subject})`);
        return true;
      } else {
        const errText = await response.text();
        console.warn(`⚠️  [SendGrid] API error (${response.status}): ${errText}`);
      }
    } catch (err: any) {
      console.warn(`⚠️  [SendGrid] Network error: ${err.message}`);
    }
  }

  // 3. Informative Console Output (Active in Dev / Local Mode when SMTP credentials are not yet set)
  console.log('\n======================================================');
  console.log(`📧 [EMAIL DISPATCH] To: ${to}`);
  console.log(`📌 Subject: ${subject}`);
  console.log(`📄 Content:\n${text}`);
  console.log('======================================================\n');

  return true;
};

export const sendVerificationEmail = async (email: string, name: string, rawToken: string) => {
  const baseUrl = env.APP_URL || 'http://localhost:3000';
  const verifyUrl = `${baseUrl}/verify-email/${rawToken}`;
  const subject = 'Activate Your ClearFlow Account — Verify Your Email';
  const text = `Hello ${name},\n\nThank you for registering on ClearFlow — AI-Powered Facility Management System.\n\nPlease verify your email address by clicking the link below:\n${verifyUrl}\n\nIf you did not create this account, please ignore this email.\n\nBest regards,\nClearFlow Team`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background-color: #0d9488; color: #ffffff; width: 44px; height: 44px; line-height: 44px; border-radius: 10px; font-weight: bold; font-size: 20px;">CF</div>
        <h2 style="color: #0f172a; margin: 12px 0 4px 0; font-size: 22px;">Verify Your Email Address</h2>
        <p style="color: #64748b; font-size: 14px; margin: 0;">ClearFlow AI-Powered Facility Management System</p>
      </div>
      <p style="color: #334155; line-height: 1.6; font-size: 15px;">Hello <strong>${name}</strong>,</p>
      <p style="color: #334155; line-height: 1.6; font-size: 15px;">Thank you for creating an account on ClearFlow. Please click the button below to confirm your email and activate your account:</p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${verifyUrl}" style="background: linear-gradient(135deg, #0d9488, #10b981); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);">Verify Email Address</a>
      </div>
      <p style="color: #64748b; font-size: 13px; line-height: 1.5;">Or copy and paste this direct link into your browser:<br/><a href="${verifyUrl}" style="color: #0d9488; word-break: break-all;">${verifyUrl}</a></p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">ClearFlow Facility Management System &bull; Global Operations</p>
    </div>
  `;

  await sendEmail({ to: email, subject, text, html });
  return { verifyUrl };
};

export const sendPasswordResetEmail = async (email: string, name: string, rawToken: string) => {
  const baseUrl = env.APP_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/reset-password/${rawToken}`;
  const subject = 'Reset Your ClearFlow Password';
  const text = `Hello ${name},\n\nA password reset request was received for your ClearFlow account.\n\nClick the link below to set a new password (link expires in 1 hour):\n${resetUrl}\n\nIf you did not request a password reset, you can safely ignore this email.\n\nBest regards,\nClearFlow Team`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background-color: #0d9488; color: #ffffff; width: 44px; height: 44px; line-height: 44px; border-radius: 10px; font-weight: bold; font-size: 20px;">CF</div>
        <h2 style="color: #0f172a; margin: 12px 0 4px 0; font-size: 22px;">Reset Your Password</h2>
        <p style="color: #64748b; font-size: 14px; margin: 0;">ClearFlow AI-Powered Facility Management System</p>
      </div>
      <p style="color: #334155; line-height: 1.6; font-size: 15px;">Hello <strong>${name}</strong>,</p>
      <p style="color: #334155; line-height: 1.6; font-size: 15px;">We received a request to reset your password. Click the button below to choose a new password:</p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${resetUrl}" style="background: linear-gradient(135deg, #0d9488, #10b981); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);">Reset Password</a>
      </div>
      <p style="color: #e11d48; font-size: 13px; font-weight: 500;">⚠️ This link will expire in 1 hour.</p>
      <p style="color: #64748b; font-size: 13px; line-height: 1.5;">Or copy and paste this link into your browser:<br/><a href="${resetUrl}" style="color: #0d9488; word-break: break-all;">${resetUrl}</a></p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `;

  await sendEmail({ to: email, subject, text, html });
  return { resetUrl };
};
