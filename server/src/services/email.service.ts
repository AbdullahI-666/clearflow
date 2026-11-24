import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { CLEARFLOW_LOGO_PNG_BASE64 } from '../assets/logoBase64.js';

export const CLEARFLOW_LOGO_CDN_URL =
  'https://zayeotwnijgvafqikgfl.supabase.co/storage/v1/object/public/public-assets/clearflow-logo.png';

export interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded string
  cid?: string;
  type?: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  code?: string;
  attachments?: EmailAttachment[];
  tags?: string[];
}

export interface EmailLogItem {
  id: string;
  timestamp: string;
  to: string;
  subject: string;
  status: 'DELIVERED' | 'FAILED' | 'LOCAL_LOGGED';
  provider: string;
  messageId?: string;
  code?: string;
  error?: string;
  note?: string;
}

export const EMAIL_DELIVERY_LOGS: EmailLogItem[] = [];

export const getEmailLogs = (filterEmail?: string): EmailLogItem[] => {
  const norm = (filterEmail || '').toLowerCase().trim();
  if (norm) {
    return EMAIL_DELIVERY_LOGS.filter((l) => l.to.toLowerCase() === norm);
  }
  return EMAIL_DELIVERY_LOGS.slice(0, 30);
};

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
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return null;
};

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  const { to, subject, text, html, code, attachments, tags } = options;

  const senderEmail = env.BREVO_SENDER_EMAIL || 'getclearflow@gmail.com';
  const senderName = env.BREVO_SENDER_NAME || 'ClearFlow';

  // 1. Check Brevo REST API v3 (Primary & Most Reliable)
  if (env.BREVO_API_KEY && env.BREVO_API_KEY.startsWith('xkeysib-')) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': env.BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: senderName,
            email: senderEmail,
          },
          to: [{ email: to }],
          replyTo: {
            name: `${senderName} Support`,
            email: senderEmail,
          },
          subject,
          htmlContent: html,
          textContent: text,
          tags: tags || ['transactional-otp'],
          headers: {
            'Auto-Submitted': 'auto-generated',
            'X-Auto-Response-Suppress': 'All',
            'X-Entity-Ref-ID': `clearflow-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            'Feedback-ID': 'clearflow:transactional:brevo',
          },
          ...(attachments && attachments.length > 0
            ? {
                attachment: attachments.map((att) => ({
                  name: att.filename,
                  content: att.content,
                })),
              }
            : {}),
        }),
      });

      const resData = (await response.json()) as any;
      if (response.ok && resData.messageId) {
        console.log(`✉️  [Brevo REST API] Live email successfully dispatched to ${to} (MsgID: ${resData.messageId})`);
        EMAIL_DELIVERY_LOGS.unshift({
          id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          timestamp: new Date().toLocaleTimeString(),
          to,
          subject,
          status: 'DELIVERED',
          provider: 'Brevo Official API v3',
          messageId: resData.messageId,
          code,
          note: 'Directly delivered via Brevo REST API v3 to your email.',
        });
        return true;
      } else {
        console.warn(`⚠️  [Brevo REST API] Delivery warning (${response.status}):`, resData);
      }
    } catch (err: any) {
      console.warn(`⚠️  [Brevo REST API] Network error: ${err.message}`);
    }
  }

  // 2. Check Nodemailer SMTP Transport
  const transporter = getTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        replyTo: `"${senderName} Support" <${senderEmail}>`,
        to,
        subject,
        text,
        html,
        headers: {
          'X-Auto-Response-Suppress': 'OOF, AutoReply',
          'X-Entity-Ref-ID': `clearflow-${Date.now()}`,
        },
        attachments: attachments?.map((att) => ({
          filename: att.filename,
          content: Buffer.from(att.content, 'base64'),
          cid: att.cid || att.filename,
        })),
      });
      console.log(`✉️  [SMTP] Live email successfully dispatched to ${to} (MsgID: ${info.messageId})`);
      EMAIL_DELIVERY_LOGS.unshift({
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        timestamp: new Date().toLocaleTimeString(),
        to,
        subject,
        status: 'DELIVERED',
        provider: 'Brevo SMTP (smtp-relay.brevo.com:587)',
        messageId: info.messageId,
        code,
        note: 'Successfully handed off to Brevo Relay. Delivered directly.',
      });
      return true;
    } catch (err: any) {
      console.warn(`⚠️  [SMTP] Delivery error to ${to}: ${err.message}`);
      EMAIL_DELIVERY_LOGS.unshift({
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        timestamp: new Date().toLocaleTimeString(),
        to,
        subject,
        status: 'FAILED',
        provider: 'Brevo SMTP (smtp-relay.brevo.com:587)',
        error: err.message,
        code,
        note: 'Brevo SMTP rejected delivery. Check error details.',
      });
    }
  }

  // 3. Check SendGrid HTTP API if SendGrid Key is provided
  if (env.SENDGRID_API_KEY && env.SENDGRID_API_KEY.startsWith('SG.')) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: (env as any).SENDGRID_FROM_EMAIL || senderEmail, name: senderName },
          reply_to: { email: senderEmail, name: `${senderName} Support` },
          subject,
          content: [
            { type: 'text/plain', value: text },
            { type: 'text/html', value: html },
          ],
        }),
      });

      if (response.ok) {
        console.log(`✉️  [SendGrid] Live email successfully dispatched to ${to}`);
        EMAIL_DELIVERY_LOGS.unshift({
          id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          timestamp: new Date().toLocaleTimeString(),
          to,
          subject,
          status: 'DELIVERED',
          provider: 'SendGrid Web API',
          code,
          note: 'Delivered via SendGrid direct email service.',
        });
        return true;
      }
    } catch (err: any) {
      console.warn(`⚠️  [SendGrid] Delivery error to ${to}: ${err.message}`);
    }
  }

  // 4. Fallback: Log directly to terminal
  console.log(`\n======================================================`);
  console.log(`✉️  [SIMULATED EMAIL DISPATCH] (No live email credentials active)`);
  console.log(`   To:      ${to}`);
  console.log(`   Subject: ${subject}`);
  if (code) {
    console.log(`   🔑 4-Digit Code: >>> ${code} <<<`);
  }
  console.log(`======================================================\n`);

  EMAIL_DELIVERY_LOGS.unshift({
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toLocaleTimeString(),
    to,
    subject,
    status: 'LOCAL_LOGGED',
    provider: 'Local Simulator (Terminal)',
    code,
    note: 'SMTP not configured or offline. Code logged to terminal.',
  });

  return true;
};

export const sendVerificationEmail = async (
  email: string,
  name: string,
  code: string,
  rawToken?: string,
  customBaseUrl?: string,
  role?: string
) => {
  const baseUrl = customBaseUrl || env.APP_URL || 'http://localhost:5173';
  const roleParam = role ? `&role=${encodeURIComponent(role.toLowerCase())}` : '';
  const verifyUrl = `${baseUrl.replace(/\/$/, '')}/verify-email?email=${encodeURIComponent(email)}${roleParam}`;
  
  const subject = 'ClearFlow Security Verification Code';

  const text = `ClearFlow Account Verification

Hello ${name},

Thank you for creating an account on ClearFlow Facility Management.

Your 4-digit verification code is:
>>> ${code} <<<

This code is valid for 24 hours. ClearFlow representatives will never ask you for this code.

You can also verify your account directly by visiting:
${verifyUrl}

If you did not create this account, please disregard this email.

---
ClearFlow Facility & Asset Management Systems
Lahore, Pakistan • getclearflow@gmail.com
© ${new Date().getFullYear()} ClearFlow Technologies. All rights reserved.`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClearFlow Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Preheader preview text for inbox list -->
  <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
    Your ClearFlow security verification code. Valid for 24 hours. ClearFlow representatives will never ask for this code.
  </div>

  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05); text-align: left;">
          <!-- Header Branding -->
          <tr>
            <td align="center" style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #f1f5f9; background-color: #ffffff;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="vertical-align: middle;">
                    <div style="width: 48px; height: 48px; background-color: #0d9488; border-radius: 12px; overflow: hidden; display: inline-block;">
                      <img src="cid:clearflow-logo.png" alt="ClearFlow" width="48" height="48" style="display: block; width: 48px; height: 48px; border-radius: 12px; border: 0; outline: none;" />
                    </div>
                  </td>
                  <td style="padding-left: 14px; vertical-align: middle;">
                    <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 26px; font-weight: 800; color: #0b1a2d; letter-spacing: -0.5px;">ClearFlow</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 36px 24px 36px;">
              <h1 style="color: #0f172a; margin: 0 0 16px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.3px; text-align: center;">Verify Your Email Address</h1>
              <p style="color: #334155; line-height: 1.6; font-size: 15px; margin: 0 0 12px 0;">Hello <strong>${name}</strong>,</p>
              <p style="color: #475569; line-height: 1.6; font-size: 15px; margin: 0 0 24px 0;">Thank you for creating an account on ClearFlow. Please enter the following 4-digit verification code to confirm your email address and activate your profile:</p>

              <!-- 4-Digit Code Box -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: #f0fdf4; border: 2px dashed #0d9488; border-radius: 14px;">
                <tr>
                  <td align="center" style="padding: 24px 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #0f766e; text-transform: uppercase; letter-spacing: 1.5px;">Your Security Verification Code</p>
                    <div style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #0d9488; font-family: 'Courier New', Courier, monospace; padding-left: 12px; line-height: 1.2;">
                      ${code}
                    </div>
                    <p style="margin: 10px 0 0 0; font-size: 13px; color: #64748b; font-weight: 500;">
                      Valid for 24 hours &bull; Do not share with anyone
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Button CTA -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 28px auto;">
                <tr>
                  <td align="center" style="border-radius: 10px; background-color: #0d9488;">
                    <a href="${verifyUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 10px; background-color: #0d9488;">
                      Verify Account &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 20px 0 0 0; text-align: center;">
                Or enter this code on the verification page in your browser.
              </p>
            </td>
          </tr>

          <!-- Security Disclosure -->
          <tr>
            <td style="padding: 16px 36px 24px 36px; background-color: #f8fafc; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                <strong>Security Notice:</strong> ClearFlow representatives will never ask for this code. If you did not create a ClearFlow account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #ffffff; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #334155;">
                ClearFlow Facility Management Systems
              </p>
              <p style="margin: 0 0 8px 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                Automated Transactional Dispatch &bull; Lahore, Pakistan<br />
                Support: <a href="mailto:getclearflow@gmail.com" style="color: #0d9488; text-decoration: none;">getclearflow@gmail.com</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #cbd5e1;">
                &copy; ${new Date().getFullYear()} ClearFlow Technologies. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    await sendEmail({
      to: email,
      subject,
      text,
      html,
      code,
      tags: ['transactional-verification'],
      attachments: [
        {
          filename: 'clearflow-logo.png',
          content: CLEARFLOW_LOGO_PNG_BASE64,
          cid: 'clearflow-logo.png',
          type: 'image/png',
        },
      ],
    });
  } catch (err: any) {
    console.warn(`⚠️ [EMAIL_WARNING] Could not dispatch verification email to ${email}:`, err.message);
  }

  console.log(`\n======================================================`);
  console.log(`🔢 [4-DIGIT VERIFICATION CODE FOR ${email}]:`);
  console.log(`   >>> ${code} <<<`);
  console.log(`🔗 [VERIFY URL]: ${verifyUrl}`);
  console.log(`======================================================\n`);

  return { verifyUrl, code };
};

export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  code: string,
  rawToken?: string,
  customBaseUrl?: string,
  role?: string
) => {
  const baseUrl = customBaseUrl || env.APP_URL || 'http://localhost:5173';
  const roleParam = role ? `?role=${encodeURIComponent(role.toLowerCase())}` : '';
  const resetUrl = rawToken ? `${baseUrl.replace(/\/$/, '')}/reset-password/${rawToken}${roleParam}` : '';
  
  const subject = 'ClearFlow Password Recovery Code';

  const text = `ClearFlow Password Recovery

Hello ${name},

We received a request to reset your ClearFlow account password.

Your 4-digit recovery code is:
>>> ${code} <<<

This code is valid for 1 hour. ClearFlow representatives will never ask you for this code.

${resetUrl ? `You can also reset your password directly by visiting:\n${resetUrl}\n\n` : ''}If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.

---
ClearFlow Facility & Asset Management Systems
Lahore, Pakistan • getclearflow@gmail.com
© ${new Date().getFullYear()} ClearFlow Technologies. All rights reserved.`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClearFlow Password Reset</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Preheader preview text for inbox list -->
  <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
    Your ClearFlow password recovery code. Valid for 1 hour. ClearFlow representatives will never ask for this code.
  </div>

  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05); text-align: left;">
          <!-- Header Branding -->
          <tr>
            <td align="center" style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #f1f5f9; background-color: #ffffff;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="vertical-align: middle;">
                    <div style="width: 48px; height: 48px; background-color: #0d9488; border-radius: 12px; overflow: hidden; display: inline-block;">
                      <img src="cid:clearflow-logo.png" alt="ClearFlow" width="48" height="48" style="display: block; width: 48px; height: 48px; border-radius: 12px; border: 0; outline: none;" />
                    </div>
                  </td>
                  <td style="padding-left: 14px; vertical-align: middle;">
                    <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 26px; font-weight: 800; color: #0b1a2d; letter-spacing: -0.5px;">ClearFlow</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 36px 24px 36px;">
              <h1 style="color: #0f172a; margin: 0 0 16px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.3px; text-align: center;">Reset Your Password</h1>
              <p style="color: #334155; line-height: 1.6; font-size: 15px; margin: 0 0 12px 0;">Hello <strong>${name}</strong>,</p>
              <p style="color: #475569; line-height: 1.6; font-size: 15px; margin: 0 0 24px 0;">We received a request to reset your password. Please enter the following 4-digit recovery code on the website to choose a new password:</p>

              <!-- 4-Digit Code Box -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: #f0fdf4; border: 2px dashed #0d9488; border-radius: 14px;">
                <tr>
                  <td align="center" style="padding: 24px 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #0f766e; text-transform: uppercase; letter-spacing: 1.5px;">Your 4-Digit Recovery Code</p>
                    <div style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #0d9488; font-family: 'Courier New', Courier, monospace; padding-left: 12px; line-height: 1.2;">
                      ${code}
                    </div>
                    <p style="margin: 10px 0 0 0; font-size: 13px; color: #64748b; font-weight: 500;">
                      Valid for 1 hour &bull; Do not share with anyone
                    </p>
                  </td>
                </tr>
              </table>

              ${
                resetUrl
                  ? `<!-- Button CTA -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 28px auto;">
                <tr>
                  <td align="center" style="border-radius: 10px; background-color: #0d9488;">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 10px; background-color: #0d9488;">
                      Reset Password &rarr;
                    </a>
                  </td>
                </tr>
              </table>`
                  : ''
              }

              <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 20px 0 0 0; text-align: center;">
                If you did not request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Security Disclosure -->
          <tr>
            <td style="padding: 16px 36px 24px 36px; background-color: #f8fafc; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                <strong>Security Notice:</strong> ClearFlow representatives will never ask for this code. Your password remains safe and will not change until you verify this request.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #ffffff; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #334155;">
                ClearFlow Facility Management Systems
              </p>
              <p style="margin: 0 0 8px 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                Automated Transactional Dispatch &bull; Lahore, Pakistan<br />
                Support: <a href="mailto:getclearflow@gmail.com" style="color: #0d9488; text-decoration: none;">getclearflow@gmail.com</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #cbd5e1;">
                &copy; ${new Date().getFullYear()} ClearFlow Technologies. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  console.log(`\n======================================================`);
  console.log(`🔢 [4-DIGIT RECOVERY CODE FOR ${email}]:`);
  console.log(`   >>> ${code} <<<`);
  if (resetUrl) console.log(`🔗 [RESET URL]: ${resetUrl}`);
  console.log(`======================================================\n`);

  try {
    await sendEmail({
      to: email,
      subject,
      text,
      html,
      code,
      tags: ['transactional-recovery'],
      attachments: [
        {
          filename: 'clearflow-logo.png',
          content: CLEARFLOW_LOGO_PNG_BASE64,
          cid: 'clearflow-logo.png',
          type: 'image/png',
        },
      ],
    });
  } catch (err: any) {
    console.warn(`⚠️ [EMAIL_WARNING] Could not dispatch reset email to ${email}:`, err.message);
  }
  return { resetUrl, code };
};
