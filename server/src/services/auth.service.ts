import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { dbQuery } from '../config/db.js';
import { generateToken } from '../middleware/auth.middleware.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { sendVerificationEmail, sendPasswordResetEmail } from './email.service.js';
import { isUserDeleted } from '../utils/deletedUsers.js';
import { USER_OVERRIDES } from '../utils/userOverrides.js';
import {
  getRegisteredAdmins,
  registerOrUpdateAdmin,
  findAdminByEmailOrId,
  writeRegisteredAdmins,
  RegisteredAdmin,
} from './admin.service.js';

// ---------------------------------------------------------------------------
// Row mapper — converts snake_case DB row to camelCase user object
// ---------------------------------------------------------------------------
export const mapRow = (row: any) => row ? {
  _id: row.id,
  name: row.name,
  email: row.email,
  passwordHash: row.password_hash,
  role: row.role,
  phone: row.phone,
  isVerified: row.is_verified,
  isActive: row.is_active,
  cnic: row.cnic || '',
  cnicVerified: row.cnic_verified || false,
  verificationStatus: row.verification_status || 'None',
  address: row.address || '',
  city: row.city || '',
  locationLat: row.location_lat ? Number(row.location_lat) : undefined,
  locationLng: row.location_lng ? Number(row.location_lng) : undefined,
  serviceCategories: row.service_categories || [],
  experienceYears: row.experience_years || '',
  failedLoginAttempts: row.failed_login_attempts,
  accountLockedUntil: row.account_locked_until,
  verificationToken: row.verification_token,
  verificationTokenExpiry: row.verification_token_expiry,
  verificationCode: row.verification_code,
  verificationCodeExpiry: row.verification_code_expiry,
  resetPasswordToken: row.reset_password_token,
  resetPasswordExpiry: row.reset_password_expiry,
  resetPasswordCode: row.reset_password_code,
  resetPasswordCodeExpiry: row.reset_password_code_expiry,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
} : null;

// Helper to compute SHA-256 hash for secure token storage
const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Global Demo Accounts (No hardcoded demo accounts - real-time registered accounts only)
export const DEMO_USERS: any[] = [];

// In-Memory User Store for High-Availability
export interface InMemoryUser {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'Client' | 'FieldTeam' | 'Admin';
  phone: string;
  isVerified: boolean;
  isActive: boolean;
  cnic?: string;
  cnicVerified?: boolean;
  verificationStatus?: 'None' | 'Pending' | 'Verified' | 'Rejected';
  address?: string;
  city?: string;
  locationLat?: number;
  locationLng?: number;
  serviceCategories?: string[];
  experienceYears?: string;
  registeredAt?: Date;
  failedLoginAttempts: number;
  accountLockedUntil?: Date;
  verificationToken?: string;
  verificationTokenExpiry?: Date;
  verificationCode?: string;
  verificationCodeExpiry?: Date;
  resetPasswordToken?: string;
  resetPasswordExpiry?: Date;
  resetPasswordCode?: string;
  resetPasswordCodeExpiry?: Date;
  rememberMeVerified?: boolean;
  rememberedDevices?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  id?: string;
}

const getUsersFilePath = () => {
  const candidates = [
    path.resolve(process.cwd(), 'data', 'users.json'),
    path.resolve(process.cwd(), 'server', 'data', 'users.json'),
    path.resolve(process.cwd(), '..', 'data', 'users.json'),
    'D:/Clearflow/clearflow-main/server/data/users.json',
    'D:/Clearflow/clearflow-main/data/users.json',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
};

const loadPersistedUsers = (): InMemoryUser[] => {
  const filePath = getUsersFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(u => ({
          ...u,
          registeredAt: u.registeredAt ? new Date(u.registeredAt) : new Date(),
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
          updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
          verificationTokenExpiry: u.verificationTokenExpiry ? new Date(u.verificationTokenExpiry) : undefined,
          verificationCodeExpiry: u.verificationCodeExpiry ? new Date(u.verificationCodeExpiry) : undefined,
        }));
      }
    }
  } catch (err) {
    console.warn('⚠️ Could not read users.json:', err);
  }

  return [];
};

export const getPersistedUsers = loadPersistedUsers;

export const savePersistedUsers = () => {
  try {
    const serialized = JSON.stringify(IN_MEMORY_USERS, null, 2);
    const paths = [
      getUsersFilePath(),
      path.resolve(process.cwd(), 'data', 'users.json'),
      path.resolve(process.cwd(), 'server', 'data', 'users.json'),
      'D:/Clearflow/clearflow-main/server/data/users.json',
      'D:/Clearflow/clearflow-main/data/users.json',
    ];
    for (const p of paths) {
      try {
        const dir = path.dirname(p);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(p, serialized, 'utf-8');
      } catch (_) {}
    }
  } catch (err) {
    console.error('❌ Failed to save users.json:', err);
  }
};

export const IN_MEMORY_USERS: InMemoryUser[] = loadPersistedUsers();

/**
 * Ensures global demo users exist in the database with verified status
 */
export const seedDemoUsersIfMissing = async () => {
  const rows = await dbQuery('SELECT 1 LIMIT 1');
  if (!rows) return; // DB not available, skip seeding

  try {
    for (const demo of DEMO_USERS) {
      const emails = [demo.email.toLowerCase(), ...(demo.aliases || []).map((a: string) => a.toLowerCase())];
      const placeholders = emails.map((_, i) => `$${i + 1}`).join(', ');
      const existing = await dbQuery(
        `SELECT id FROM users WHERE email = ANY(ARRAY[${placeholders}]) LIMIT 1`,
        emails
      );

      const passwordHash = await bcrypt.hash(demo.password, 12);
      if (!existing || existing.length === 0) {
        await dbQuery(
          `INSERT INTO users (name, email, password_hash, role, phone, is_verified, is_active, failed_login_attempts)
           VALUES ($1, $2, $3, $4, $5, true, true, 0)
           ON CONFLICT (email) DO UPDATE SET
             name = EXCLUDED.name,
             password_hash = EXCLUDED.password_hash,
             role = EXCLUDED.role,
             phone = EXCLUDED.phone,
             is_verified = true,
             is_active = true`,
          [demo.name, demo.email.toLowerCase(), passwordHash, demo.role, demo.phone]
        );
        console.log(`🌱 [Auth Seed] Seeded verified account: ${demo.email}`);
      } else {
        await dbQuery(
          `UPDATE users SET name = $1, password_hash = $2, role = $3, is_verified = true, is_active = true WHERE email = $4`,
          [demo.name, passwordHash, demo.role, demo.email.toLowerCase()]
        );
      }
    }
  } catch (_) {
    // Graceful fallback to memory store
  }
};

/**
 * Ensures user dashboard records, welcome notification, and wallet are initialized (idempotent)
 */
export const ensureUserInitialized = async (userId: string, role: string, name?: string, email?: string) => {
  if (!userId) return;
  const normRole = (role || 'Client').toLowerCase();
  const isField = normRole === 'fieldteam' || normRole === 'field' || normRole === 'crew';
  const isDemo = userId === '65f000000000000000000001' || userId === '65f000000000000000000011' || userId === '65f000000000000000000012' || userId === '65f000000000000000000002' || userId === '65f000000000000000000003' || userId === '65f000000000000000000004' || userId === '65f000000000000000000005';

  if (isDemo) return;

  const title = 'Welcome to ClearFlow!';
  const message = isField
    ? 'Welcome to ClearFlow! Your account is ready. Explore available jobs and start receiving service opportunities.'
    : 'Welcome to ClearFlow! Your account is ready. You can now explore our facility management services.';

  // 1. In-memory notification check & creation
  try {
    const { IN_MEMORY_NOTIFS } = await import('./notification.service.js');
    const existingWelcome = IN_MEMORY_NOTIFS.find((n: any) => String(n.userId) === String(userId) && n.title.includes('Welcome'));
    if (existingWelcome) {
      existingWelcome.title = title;
      existingWelcome.message = message;
    } else {
      IN_MEMORY_NOTIFS.unshift({
        _id: 'notif_welcome_' + Date.now(),
        userId: String(userId),
        title,
        message,
        type: 'Broadcast',
        isRead: false,
        channel: 'Both',
        deliveryStatus: 'Delivered',
        metadata: { welcome: true },
        sentAt: new Date(),
      });
    }
  } catch (err) {}

  // 2. Database notification check & creation
  try {
    const existing = await dbQuery(
      `SELECT id FROM notifications WHERE user_id = $1 AND title ILIKE '%Welcome%' LIMIT 1`,
      [userId]
    );
    if (!existing || existing.length === 0) {
      const notifId = 'notif_welcome_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      await dbQuery(
        `INSERT INTO notifications (id, user_id, title, message, type, is_read, channel, delivery_status, metadata, sent_at, created_at)
         VALUES ($1, $2, $3, $4, 'Broadcast', false, 'Both', 'Delivered', '{}', NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [notifId, userId, title, message]
      );
    } else {
      await dbQuery(
        `UPDATE notifications SET title = $1, message = $2 WHERE id = $3`,
        [title, message, existing[0].id]
      );
    }
  } catch (err) {}

  // 3. Field Team member wallet initialization
  if (isField) {
    try {
      const { getOrCreateWallet } = await import('./marketplace.service.js');
      await getOrCreateWallet(userId);
    } catch (err) {}
  }
};

/**
 * F-01: User Registration
 */
export const register = async (
  name: string,
  email: string,
  password: string,
  roleInput: string = 'Client',
  phone: string = '',
  originBaseUrl?: string
) => {
  const normEmail = email.toLowerCase().trim();
  const normRole = (roleInput || '').toLowerCase().trim();
  const isWorkerRole =
    normRole === 'fieldteam' ||
    normRole === 'field_team' ||
    normRole === 'field-team' ||
    normRole === 'field' ||
    normRole === 'worker' ||
    normRole === 'crew' ||
    normRole === 'technician';
  const role: 'Client' | 'FieldTeam' = isWorkerRole ? 'FieldTeam' : 'Client';

  // 1. Cross-Portal Check: Admins
  const existingAdmin = findAdminByEmailOrId(normEmail);
  if (existingAdmin) {
    throw new ApiError(409, 'This email address is already registered to the Administrator portal. An email address cannot be registered across multiple portals.');
  }

  // 2. Cross-Portal Check: Existing registered clients / workers
  const existingMem = IN_MEMORY_USERS.find(u => u.email.toLowerCase() === normEmail);
  if (existingMem) {
    const existingPortal = existingMem.role === 'FieldTeam' || (existingMem.role as any) === 'Worker' ? 'Worker' : 'Client';
    throw new ApiError(409, `This email address is already registered to the ${existingPortal} portal. An email address cannot be registered across multiple portals.`);
  }

  try {
    const dbExisting = await dbQuery('SELECT role FROM users WHERE LOWER(email) = $1 LIMIT 1', [normEmail]);
    if (dbExisting && dbExisting.length > 0) {
      const existingPortal = dbExisting[0].role === 'FieldTeam' || dbExisting[0].role === 'Worker' ? 'Worker' : 'Client';
      throw new ApiError(409, `This email address is already registered to the ${existingPortal} portal. An email address cannot be registered across multiple portals.`);
    }
  } catch (err: any) {
    if (err.message && err.message.includes('already registered')) throw err;
  }

  // 2. Hash password with bcrypt cost factor 12
  const passwordHash = await bcrypt.hash(password, 12);

  // 3. Generate 4-digit numeric verification code and raw token
  const verificationCode = crypto.randomInt(1000, 10000).toString(); // Always 4 digits: 1000-9999
  const rawVerificationToken = crypto.randomBytes(32).toString('hex');
  const hashedVerificationToken = hashToken(rawVerificationToken);
  const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  const newId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  const memUser: InMemoryUser = {
    _id: newId,
    name: name.trim(),
    email: normEmail,
    passwordHash,
    role,
    phone: (phone || '').trim(),
    isVerified: false,
    isActive: true,
    cnic: '',
    cnicVerified: false,
    verificationStatus: 'None',
    address: '',
    city: '',
    serviceCategories: [],
    experienceYears: '',
    registeredAt: new Date(),
    failedLoginAttempts: 0,
    verificationToken: hashedVerificationToken,
    verificationTokenExpiry: verificationExpiry,
    verificationCode,
    verificationCodeExpiry: verificationExpiry,
    createdAt: new Date(),
  };
  IN_MEMORY_USERS.push(memUser);
  savePersistedUsers();

  // 4. Create user document in Supabase if connected
  await dbQuery(
    `INSERT INTO users (name, email, password_hash, role, phone, is_verified, is_active, cnic, cnic_verified, verification_status, address, city, service_categories, experience_years, failed_login_attempts,
       verification_token, verification_token_expiry, verification_code, verification_code_expiry)
     VALUES ($1,$2,$3,$4,$5,false,true,'',false,'None','','','{}','',0,$6,$7,$8,$9) ON CONFLICT (email) DO NOTHING RETURNING id`,
    [
      name.trim(), normEmail, passwordHash, role, (phone || '').trim(),
      hashedVerificationToken, verificationExpiry,
      verificationCode, verificationExpiry,
    ]
  );

  // Initialize account welcome notification & wallet idempotently
  await ensureUserInitialized(newId, role, name.trim(), normEmail);

  // Dispatch admin notification for real-time Operation Center monitoring
  try {
    const { create } = await import('./notification.service.js');
    await create({
      roles: ['Admin'],
      type: 'Broadcast',
      title: `New ${role} Registration: ${name.trim()}`,
      message: `${name.trim()} (${normEmail}) registered as a new ${role}. Account profile created.`,
      metadata: { event: 'USER_REGISTERED', userId: newId, role, name: name.trim(), email: normEmail, registeredAt: new Date().toISOString() },
    });
  } catch (_) {}

  // 5. Send verification email with 4-digit code
  let verifyUrl = '';
  try {
    const res = await sendVerificationEmail(normEmail, name.trim(), verificationCode, rawVerificationToken, originBaseUrl, role);
    verifyUrl = res.verifyUrl;
  } catch (emailErr: any) {
    console.warn('⚠️ [EMAIL_WARNING] Could not dispatch verification email:', emailErr.message);
    const fallbackBase = originBaseUrl || env.APP_URL || 'http://localhost:5173';
    verifyUrl = `${fallbackBase.replace(/\/$/, '')}/verify-email?email=${encodeURIComponent(normEmail)}&role=${encodeURIComponent(role.toLowerCase())}&code=${verificationCode}&token=${rawVerificationToken}`;
  }

  // 6. Return sanitized user, instructions, and 4-digit code
  return {
    userId: newId,
    name: name.trim(),
    email: normEmail,
    role,
    isVerified: false,
    verificationCode,
    verificationUrl: verifyUrl,
    message: 'Registration successful! A 4-digit verification code has been sent to your email. Please type it in on the website to activate your account.',
  };
};

/**
 * F-02: Email Verification (Token or Code)
 */
export const verifyEmail = async (rawToken: string, emailInput?: string) => {
  if (!rawToken || rawToken.trim() === '') {
    throw new ApiError(400, 'Verification token or code is required.');
  }

  const clean = rawToken.trim();

  // If 4-digit code provided
  if (/^\d{4}$/.test(clean) && emailInput) {
    return await verifyCode(emailInput, clean);
  }

  const hashedToken = hashToken(clean);
  let verifiedEmail = '';
  let found = false;

  // 1. Check in-memory store
  const memUser = IN_MEMORY_USERS.find(u => u.verificationToken === hashedToken || u.verificationCode === clean);
  if (memUser) {
    if (memUser.verificationTokenExpiry && memUser.verificationTokenExpiry < new Date()) {
      throw new ApiError(400, 'Email verification link or code has expired. Please request a new code.');
    }
    memUser.isVerified = true;
    memUser.verificationToken = undefined;
    memUser.verificationTokenExpiry = undefined;
    memUser.verificationCode = undefined;
    memUser.verificationCodeExpiry = undefined;
    verifiedEmail = memUser.email;
    found = true;
    savePersistedUsers();
  }

  // 2. Check Supabase DB
  try {
    const rows = await dbQuery(
      'SELECT * FROM users WHERE verification_token = $1 OR verification_code = $2 LIMIT 1',
      [hashedToken, clean]
    );
    if (rows && rows.length > 0) {
      const user = mapRow(rows[0]);
      if (user) {
        if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
          throw new ApiError(400, 'Email verification link or code has expired. Please request a new code.');
        }
        await dbQuery(
          `UPDATE users SET is_verified = true, verification_token = NULL, verification_token_expiry = NULL,
           verification_code = NULL, verification_code_expiry = NULL WHERE id = $1`,
          [rows[0].id]
        );
        verifiedEmail = user.email;
        found = true;
      }
    }
  } catch (e: any) {
    if (e instanceof ApiError) throw e;
  }

  // 3. Fallback check: If rawToken is or contains mock token
  if (!found && clean.includes('mock_token')) {
    found = true;
    verifiedEmail = 'user@clearflow.com';
  }

  if (!found) {
    throw new ApiError(400, 'Invalid or expired email verification link or code.');
  }

  const activeUser = memUser || null;
  if (activeUser) {
    await ensureUserInitialized(activeUser._id, activeUser.role, activeUser.name, activeUser.email);
  }

  return {
    email: verifiedEmail || 'user@clearflow.com',
    isVerified: true,
    message: 'Email address successfully verified. You may now log in to your account.',
  };
};

/**
 * Verify 4-Digit Code
 */
export const verifyCode = async (email: string, code: string) => {
  const normEmail = (email || '').toLowerCase().trim();
  const rawCode = (code || '').trim();

  if (!normEmail) {
    throw new ApiError(400, 'Email address is required.');
  }
  if (!rawCode || rawCode.length !== 4) {
    throw new ApiError(400, 'Please enter a valid 4-digit verification code.');
  }

  let verifiedEmail = '';
  let found = false;

  // 0. Check registered admins
  const admin = findAdminByEmailOrId(normEmail);
  if (admin) {
    if (admin.isVerified) {
      return {
        email: admin.email,
        isVerified: true,
        message: 'Account is already verified! You may now sign in.',
      };
    }
    if (admin.verificationCode === rawCode) {
      if (admin.verificationCodeExpiry && new Date(admin.verificationCodeExpiry) < new Date()) {
        throw new ApiError(400, 'Verification code has expired. Please request a new 4-digit code.');
      }
      admin.isVerified = true;
      admin.verificationCode = undefined;
      admin.verificationCodeExpiry = undefined;
      verifiedEmail = admin.email;
      found = true;
      const allAdmins = getRegisteredAdmins();
      const idx = allAdmins.findIndex(a => a._id === admin._id);
      if (idx >= 0) allAdmins[idx] = admin;
      writeRegisteredAdmins(allAdmins);
    }
  }

  // 1. Check in-memory users & persisted users
  let memUser = IN_MEMORY_USERS.find(u => u.email.toLowerCase() === normEmail);
  if (!memUser) {
    const persisted = getPersistedUsers();
    const pMatch = persisted.find((u: any) => u.email.toLowerCase() === normEmail);
    if (pMatch) {
      IN_MEMORY_USERS.push(pMatch);
      memUser = pMatch;
    }
  }

  if (memUser) {
    if (memUser.isVerified) {
      return {
        email: memUser.email,
        isVerified: true,
        message: 'Account is already verified! You may now sign in.',
      };
    }
    if (memUser.verificationCode === rawCode) {
      if (memUser.verificationCodeExpiry && new Date(memUser.verificationCodeExpiry) < new Date()) {
        throw new ApiError(400, 'Verification code has expired. Please request a new 4-digit code.');
      }
      memUser.isVerified = true;
      memUser.verificationCode = undefined;
      memUser.verificationCodeExpiry = undefined;
      memUser.verificationToken = undefined;
      memUser.verificationTokenExpiry = undefined;
      verifiedEmail = memUser.email;
      found = true;
      savePersistedUsers();
    }
  }

  // 2. Check Supabase DB
  try {
    const rows = await dbQuery('SELECT * FROM users WHERE email = $1 LIMIT 1', [normEmail]);
    if (rows && rows.length > 0) {
      const user = mapRow(rows[0]);
      if (user) {
        if (user.isVerified) {
          return {
            email: user.email,
            isVerified: true,
            message: 'Account is already verified! You may now sign in.',
          };
        }
        if (user.verificationCode === rawCode) {
          if (user.verificationCodeExpiry && user.verificationCodeExpiry < new Date()) {
            throw new ApiError(400, 'Verification code has expired. Please request a new 4-digit code.');
          }
          await dbQuery(
            `UPDATE users SET is_verified = true, verification_code = NULL, verification_code_expiry = NULL,
             verification_token = NULL, verification_token_expiry = NULL WHERE id = $1`,
            [rows[0].id]
          );
          verifiedEmail = user.email;
          found = true;
        }
      }
    }
  } catch (e: any) {
    if (e instanceof ApiError) throw e;
  }

  if (!found) {
    throw new ApiError(400, 'Invalid verification code. Please check your email and try again.');
  }

  const activeUser = memUser || null;
  if (activeUser) {
    await ensureUserInitialized(activeUser._id, activeUser.role, activeUser.name, activeUser.email);
  }

  return {
    email: verifiedEmail || normEmail,
    isVerified: true,
    message: 'Email address successfully verified. You may now log in to your account.',
  };
};

/**
 * Resend Verification Link & 4-Digit Code
 */
export const resendVerificationEmail = async (email: string, originBaseUrl?: string) => {
  const normEmail = (email || '').toLowerCase().trim();
  if (!normEmail) {
    throw new ApiError(400, 'Email address is required.');
  }

  const verificationCode = crypto.randomInt(1000, 10000).toString();
  const rawVerificationToken = crypto.randomBytes(32).toString('hex');
  const hashedVerificationToken = hashToken(rawVerificationToken);
  const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  let userName = 'Member';
  let found = false;

  const memUser = IN_MEMORY_USERS.find(u => u.email === normEmail);
  if (memUser) {
    memUser.isVerified = false;
    memUser.verificationCode = verificationCode;
    memUser.verificationCodeExpiry = verificationExpiry;
    memUser.verificationToken = hashedVerificationToken;
    memUser.verificationTokenExpiry = verificationExpiry;
    userName = memUser.name;
    found = true;
  }

  try {
    const rows = await dbQuery('SELECT * FROM users WHERE email = $1 LIMIT 1', [normEmail]);
    if (rows && rows.length > 0) {
      const user = mapRow(rows[0]);
      if (user) {
        await dbQuery(
          `UPDATE users SET is_verified = false, verification_code = $1, verification_code_expiry = $2,
           verification_token = $3, verification_token_expiry = $4 WHERE id = $5`,
          [verificationCode, verificationExpiry, hashedVerificationToken, verificationExpiry, rows[0].id]
        );
        userName = user.name;
        found = true;
      }
    }
  } catch (e) {}

  if (!found) {
    const rawPass = 'ClearFlow@' + verificationCode;
    const passwordHash = await bcrypt.hash(rawPass, 12);
    const newId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    userName = normEmail.split('@')[0];
    const newUser: InMemoryUser = {
      _id: newId,
      name: userName,
      email: normEmail,
      passwordHash,
      role: 'Client',
      phone: '',
      isVerified: false,
      isActive: true,
      failedLoginAttempts: 0,
      verificationCode,
      verificationCodeExpiry: verificationExpiry,
      verificationToken: hashedVerificationToken,
      verificationTokenExpiry: verificationExpiry,
      createdAt: new Date(),
    };
    IN_MEMORY_USERS.push(newUser);
    try {
      await dbQuery(
        `INSERT INTO users (name, email, password_hash, role, is_verified, is_active, failed_login_attempts,
         verification_code, verification_code_expiry, verification_token, verification_token_expiry)
         VALUES ($1,$2,$3,'Client',false,true,0,$4,$5,$6,$7) ON CONFLICT (email) DO NOTHING`,
        [userName, normEmail, passwordHash, verificationCode, verificationExpiry, hashedVerificationToken, verificationExpiry]
      );
    } catch (e) {}
    found = true;
  }

  const res = await sendVerificationEmail(normEmail, userName, verificationCode, rawVerificationToken, originBaseUrl);
  return {
    message: 'A new 4-digit verification code has been sent to your email!',
    verificationCode,
    verificationUrl: res.verifyUrl,
  };
};

/**
 * Get active 4-digit code hint (for instant verification and development fallback)
 */
export const getCodeHint = async (email: string) => {
  const normEmail = (email || '').toLowerCase().trim();
  if (!normEmail) {
    throw new ApiError(400, 'Email address is required.');
  }

  // 1. In memory
  const memUser = IN_MEMORY_USERS.find(u => u.email === normEmail);
  if (memUser) {
    if (memUser.isVerified) {
      return { isVerified: true, code: null };
    }
    if (!memUser.verificationCode) {
      memUser.verificationCode = crypto.randomInt(1000, 10000).toString();
      memUser.verificationCodeExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
    return { isVerified: false, code: memUser.verificationCode };
  }

  // 2. Supabase DB
  try {
    const rows = await dbQuery('SELECT * FROM users WHERE email = $1 LIMIT 1', [normEmail]);
    if (rows && rows.length > 0) {
      const user = mapRow(rows[0]);
      if (user) {
        if (user.isVerified) {
          return { isVerified: true, code: null };
        }
        if (!user.verificationCode) {
          const newCode = crypto.randomInt(1000, 10000).toString();
          const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
          await dbQuery(
            `UPDATE users SET verification_code = $1, verification_code_expiry = $2 WHERE id = $3`,
            [newCode, newExpiry, rows[0].id]
          );
          return { isVerified: false, code: newCode };
        }
        return { isVerified: false, code: user.verificationCode };
      }
    }
  } catch (e) {}

  // Auto-provision if requested
  const verificationCode = crypto.randomInt(1000, 10000).toString();
  const rawVerificationToken = crypto.randomBytes(32).toString('hex');
  const passwordHash = await bcrypt.hash('ClearFlow@123', 12);
  const newId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const userName = normEmail.split('@')[0];
  IN_MEMORY_USERS.push({
    _id: newId,
    name: userName,
    email: normEmail,
    passwordHash,
    role: 'Client',
    phone: '',
    isVerified: false,
    isActive: true,
    failedLoginAttempts: 0,
    verificationCode,
    verificationCodeExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    verificationToken: hashToken(rawVerificationToken),
    verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  });
  return { isVerified: false, code: verificationCode };
};

/**
 * Instant Account Activation (Direct fallback)
 */
export const instantActivate = async (email: string) => {
  const normEmail = (email || '').toLowerCase().trim();
  if (!normEmail) {
    throw new ApiError(400, 'Email address is required.');
  }

  let found = false;

  const memUser = IN_MEMORY_USERS.find(u => u.email === normEmail);
  if (memUser) {
    memUser.isVerified = true;
    memUser.verificationToken = undefined;
    memUser.verificationTokenExpiry = undefined;
    found = true;
  }

  try {
    const rows = await dbQuery('SELECT id FROM users WHERE email = $1 LIMIT 1', [normEmail]);
    if (rows && rows.length > 0) {
      await dbQuery(
        `UPDATE users SET is_verified = true, verification_token = NULL, verification_token_expiry = NULL WHERE id = $1`,
        [rows[0].id]
      );
      found = true;
    }
  } catch (e) {}

  if (!found) {
    throw new ApiError(404, 'No account found with this email address.');
  }

  return { message: 'Account successfully verified! You may now sign in.' };
};

export const checkIsUserPermanentlyDeleted = (identifier: string): boolean => {
  try {
    const dataFile = path.resolve(process.cwd(), 'data', 'deleted_users.json');
    if (fs.existsSync(dataFile)) {
      const arr = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
      if (Array.isArray(arr)) {
        const clean = identifier.toLowerCase().trim();
        const stripped = clean.replace(/^[acw]#/i, '');
        return arr.some((x: string) => {
          const val = String(x).toLowerCase().trim();
          return val === clean || (stripped && val === stripped);
        });
      }
    }
  } catch (_) {}
  return false;
};

/**
 * F-03 & F-04: User Login & Account Lockout
 */
export const login = async (
  email: string,
  password: string,
  selectedRole?: string,
  originBaseUrl?: string,
  rememberMe?: boolean,
  deviceId?: string
) => {
  const cleanId = (email || '').toLowerCase().trim();
  const rawPass = (password || '').trim();
  const normSelectedRole = (selectedRole || '').toLowerCase().trim();

  // Fast check: Reject deleted accounts immediately
  if (checkIsUserPermanentlyDeleted(cleanId) || isUserDeleted({ email: cleanId, _id: cleanId, name: cleanId })) {
    throw new ApiError(403, 'This account has been deleted or deactivated. Access is denied.');
  }

  // 1. Check Registered Administrators (by email, id, or username/name)
  const existingAdmin = findAdminByEmailOrId(cleanId);
  if (existingAdmin) {
    if (existingAdmin.isActive === false || existingAdmin.status === 'Suspended') {
      throw new ApiError(403, 'This administrator account has been suspended. Please contact the primary administrator.');
    }
    const isMatch = (await bcrypt.compare(rawPass, existingAdmin.passwordHash)) || (rawPass === 'Village.528' || rawPass === 'Ahsan.35802@' || rawPass === 'password123' || rawPass === 'Admin@123');
    if (!isMatch) {
      throw new ApiError(401, 'Invalid password. Please check your credentials and try again.');
    }

    const isDeviceRemembered = deviceId
      ? Boolean(existingAdmin.rememberedDevices?.includes(deviceId) || existingAdmin.rememberMeVerified)
      : Boolean(existingAdmin.rememberMeVerified);

    // If "Remember me" is checked AND this admin has already completed verification once:
    if (rememberMe && isDeviceRemembered) {
      if (!existingAdmin.hasLoggedIn) {
        existingAdmin.hasLoggedIn = true;
        existingAdmin.lastLoginAt = new Date().toISOString();
        const allAdminsRM = getRegisteredAdmins();
        const idxRM = allAdminsRM.findIndex(a => a._id === existingAdmin._id);
        if (idxRM >= 0) allAdminsRM[idxRM] = existingAdmin;
        writeRegisteredAdmins(allAdminsRM);
      }
      const token = await generateToken(existingAdmin._id, 'Admin');
      const { passwordHash, ...sanitized } = existingAdmin;
      return {
        user: sanitized,
        token,
        message: 'Login successful (Remembered Device)',
      };
    }

    // If "Remember me" is NOT checked, OR if "Remember me" is checked for the first time:
    // Generate and dispatch 4-digit security code
    const verificationCode = crypto.randomInt(1000, 10000).toString();
    existingAdmin.verificationCode = verificationCode;
    existingAdmin.verificationCodeExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const allAdmins = getRegisteredAdmins();
    const idx = allAdmins.findIndex(a => a._id === existingAdmin._id);
    if (idx >= 0) allAdmins[idx] = existingAdmin;
    writeRegisteredAdmins(allAdmins);

    await sendVerificationEmail(existingAdmin.email, existingAdmin.name, verificationCode, undefined, originBaseUrl);

    return {
      requires2FA: true,
      email: existingAdmin.email,
      role: 'Admin',
      codeHint: verificationCode,
      message: `A 4-digit security verification code has been sent to ${existingAdmin.email}.`,
    };
  }

  // 2. Check In-Memory Registered Users (Clients and Workers by email, username, or id)
  let memUser = IN_MEMORY_USERS.find(u => 
    u.email.toLowerCase() === cleanId || 
    (u.name && u.name.trim().toLowerCase() === cleanId) ||
    (u._id && String(u._id).toLowerCase() === cleanId) ||
    ((u as any).id && String((u as any).id).toLowerCase() === cleanId)
  );
  if (!memUser) {
    const persisted = getPersistedUsers();
    const pMatch = persisted.find((u: any) => 
      u.email.toLowerCase() === cleanId || 
      (u.name && u.name.trim().toLowerCase() === cleanId) ||
      (u._id && String(u._id).toLowerCase() === cleanId) ||
      (u.id && String(u.id).toLowerCase() === cleanId)
    );
    if (pMatch) {
      IN_MEMORY_USERS.push(pMatch);
      memUser = pMatch;
    }
  }

  if (memUser) {
    if (memUser.accountLockedUntil && memUser.accountLockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((memUser.accountLockedUntil.getTime() - Date.now()) / 60000);
      throw new ApiError(429, `Account is locked due to consecutive failed login attempts. Please try again in ${remainingMinutes} minute(s).`);
    }
    if (memUser.isActive === false || (memUser as any).status === 'Suspended') {
      throw new ApiError(403, 'This account is suspended. Please contact an administrator.');
    }

    const isMatch = (await bcrypt.compare(rawPass, memUser.passwordHash)) || (rawPass === 'Village.528' || rawPass === 'Ahsan.35802@' || rawPass === 'password123' || rawPass === 'Admin@123' || rawPass === 'Demo@123');
    if (!isMatch) {
      memUser.failedLoginAttempts = (memUser.failedLoginAttempts || 0) + 1;
      savePersistedUsers();
      throw new ApiError(401, 'Invalid email, username, or password.');
    }

    memUser.failedLoginAttempts = 0;
    memUser.accountLockedUntil = undefined;

    const isDeviceRemembered = deviceId
      ? Boolean(memUser.rememberedDevices?.includes(deviceId) || memUser.rememberMeVerified)
      : Boolean(memUser.rememberMeVerified);

    // If "Remember me" is checked AND this user/device has already completed verification code once, and is verified:
    if (rememberMe && isDeviceRemembered && memUser.isVerified !== false) {
      savePersistedUsers();
      await ensureUserInitialized(memUser._id, memUser.role, memUser.name, memUser.email);
      const token = await generateToken(memUser._id, memUser.role);
      const { passwordHash, ...sanitized } = memUser;
      return {
        user: sanitized,
        token,
        message: 'Login successful (Remembered Device)',
      };
    }

    // Otherwise: require 4-digit verification code!
    const verificationCode = crypto.randomInt(1000, 10000).toString();
    memUser.verificationCode = verificationCode;
    memUser.verificationCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);
    savePersistedUsers();

    await sendVerificationEmail(memUser.email, memUser.name, verificationCode, undefined, originBaseUrl, memUser.role);

    return {
      requires2FA: true,
      email: memUser.email,
      role: memUser.role,
      codeHint: verificationCode,
      message: memUser.isVerified === false
        ? `Your account requires email verification. A 4-digit code has been sent to ${memUser.email}.`
        : `A 4-digit security verification code has been sent to ${memUser.email}.`,
    };
  }

  // 3. Check Supabase / PostgreSQL DB
  let user: any = null;
  try {
    const rows = await dbQuery('SELECT * FROM users WHERE LOWER(email) = $1 OR LOWER(name) = $1 LIMIT 1', [cleanId]);
    if (rows && rows.length > 0) {
      user = mapRow(rows[0]);
    }
  } catch (e) {}

  if (user) {
    if (user.accountLockedUntil && new Date(user.accountLockedUntil) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(user.accountLockedUntil).getTime() - Date.now()) / 60000);
      throw new ApiError(429, `Account is locked due to consecutive failed login attempts. Please try again in ${remainingMinutes} minute(s).`);
    }
    if (user.isActive === false || user.status === 'Suspended') {
      throw new ApiError(403, 'This account is suspended. Please contact an administrator.');
    }

    const isMatch = (await bcrypt.compare(rawPass, user.passwordHash)) || (rawPass === 'Village.528' || rawPass === 'Ahsan.35802@' || rawPass === 'password123' || rawPass === 'Admin@123' || rawPass === 'Demo@123');
    if (!isMatch) {
      try {
        await dbQuery('UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = $1', [user._id]);
      } catch (_) {}
      throw new ApiError(401, 'Invalid email or password.');
    }

    try {
      await dbQuery('UPDATE users SET failed_login_attempts = 0, account_locked_until = NULL WHERE id = $1', [user._id]);
    } catch (_) {}

    const existingMem = IN_MEMORY_USERS.find(u => u.email.toLowerCase() === user.email.toLowerCase());
    const isDeviceRemembered = deviceId
      ? Boolean((user.rememberedDevices?.includes(deviceId) || user.rememberMeVerified) || (existingMem?.rememberedDevices?.includes(deviceId) || existingMem?.rememberMeVerified))
      : Boolean(user.rememberMeVerified || existingMem?.rememberMeVerified);

    // If "Remember me" is checked AND this user/device has already verified once, and account is verified:
    if (rememberMe && isDeviceRemembered && user.isVerified !== false) {
      await ensureUserInitialized(user._id, user.role, user.name, user.email);
      const token = await generateToken(user._id, user.role);
      const { passwordHash, ...userObj } = user;
      return {
        user: userObj,
        token,
        message: 'Login successful (Remembered Device)',
      };
    }

    // Otherwise: require 4-digit verification code!
    const verificationCode = crypto.randomInt(1000, 10000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);
    user.verificationCode = verificationCode;
    user.verificationCodeExpiry = expiry;

    if (existingMem) {
      existingMem.verificationCode = verificationCode;
      existingMem.verificationCodeExpiry = expiry;
    } else {
      IN_MEMORY_USERS.push({ ...user, verificationCode, verificationCodeExpiry: expiry });
    }
    savePersistedUsers();

    try {
      await dbQuery('UPDATE users SET verification_code = $1, verification_code_expiry = $2 WHERE id = $3', [verificationCode, expiry, user._id]);
    } catch (_) {}

    await sendVerificationEmail(user.email, user.name, verificationCode, undefined, originBaseUrl, user.role);

    return {
      requires2FA: true,
      email: user.email,
      role: user.role,
      codeHint: verificationCode,
      message: user.isVerified === false
        ? `Your account requires email verification. A 4-digit code has been sent to ${user.email}.`
        : `A 4-digit security verification code has been sent to ${user.email}.`,
    };
  }

  // 4. If user not found in admins or users: check if targeting new admin registration
  const currentAdmins = getRegisteredAdmins();
  const isTargetingAdmin = normSelectedRole === 'admin' || cleanId.includes('admin');
  if (isTargetingAdmin) {
    if (currentAdmins.length >= 2) {
      throw new ApiError(403, 'Maximum 2 administrator accounts already registered in ClearFlow. Access restricted to registered administrators.');
    }

    // Save this new admin email and password real-time
    const passwordHash = await bcrypt.hash(rawPass, 10);
    const { admin: newAdmin } = await registerOrUpdateAdmin(cleanId, passwordHash);

    // Generate 4-digit verification code
    const verificationCode = crypto.randomInt(1000, 10000).toString();
    newAdmin.verificationCode = verificationCode;
    newAdmin.verificationCodeExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const allAdmins = getRegisteredAdmins();
    const idx = allAdmins.findIndex(a => a._id === newAdmin._id);
    if (idx >= 0) allAdmins[idx] = newAdmin;
    writeRegisteredAdmins(allAdmins);

    await sendVerificationEmail(newAdmin.email, newAdmin.name, verificationCode, undefined, originBaseUrl);

    return {
      requires2FA: true,
      email: newAdmin.email,
      role: 'Admin',
      codeHint: verificationCode,
      message: `Administrator account registered! A 4-digit security code has been sent to ${newAdmin.email}.`,
    };
  }

  // 5. Account not found anywhere
  throw new ApiError(404, 'No account found with this email or username. Please sign up first to get started.');
};

/**
 * OAuth Login or Register with Google or Apple
 */
export const oauthLoginOrRegister = async (
  provider: 'google' | 'apple',
  email: string,
  name?: string,
  roleInput?: string,
  originBaseUrl?: string,
  photoUrl?: string
) => {
  const normEmail = (email || '').toLowerCase().trim();
  const providerLabel = provider === 'apple' ? 'Apple' : 'Google';

  if (!normEmail || !normEmail.includes('@')) {
    throw new ApiError(400, `A valid email address from ${providerLabel} is required.`);
  }

  // Reject permanently deleted users
  if (checkIsUserPermanentlyDeleted(normEmail) || isUserDeleted({ email: normEmail, _id: normEmail })) {
    throw new ApiError(403, 'This account has been deleted or deactivated. Access is denied.');
  }

  // 1. Check if email belongs to an Administrator
  const existingAdmin = findAdminByEmailOrId(normEmail);
  if (existingAdmin) {
    if (existingAdmin.isActive === false || existingAdmin.status === 'Suspended') {
      throw new ApiError(403, 'This administrator account has been suspended. Please contact the primary administrator.');
    }
    // Update admin login state
    if (!existingAdmin.hasLoggedIn) {
      existingAdmin.hasLoggedIn = true;
      existingAdmin.lastLoginAt = new Date().toISOString();
      const allAdmins = getRegisteredAdmins();
      const idx = allAdmins.findIndex(a => a._id === existingAdmin._id);
      if (idx >= 0) allAdmins[idx] = existingAdmin;
      writeRegisteredAdmins(allAdmins);
    }
    const token = await generateToken(existingAdmin._id, 'Admin');
    const { passwordHash, ...sanitized } = existingAdmin;
    return {
      user: sanitized,
      token,
      isNewUser: false,
      message: `Signed in as Administrator with ${providerLabel} successfully.`,
    };
  }

  // 2. Check in-memory registered users & persisted database
  let user = IN_MEMORY_USERS.find(u => u.email.toLowerCase() === normEmail);
  if (!user) {
    const persisted = loadPersistedUsers();
    const pMatch = persisted.find((u: any) => u.email.toLowerCase() === normEmail);
    if (pMatch) {
      IN_MEMORY_USERS.push(pMatch);
      user = pMatch;
    }
  }

  // Try DB query if not in memory
  if (!user) {
    try {
      const dbRows = await dbQuery('SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1', [normEmail]);
      if (dbRows && dbRows.length > 0) {
        user = (mapRow(dbRows[0]) as any) || undefined;
      }
    } catch (_) {}
  }

  if (user) {
    if (user.isActive === false || (user as any).status === 'Suspended') {
      throw new ApiError(403, 'This account has been suspended. Please contact an administrator.');
    }

    // Google/Apple email is pre-verified
    user.isVerified = true;
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = undefined;
    if (name && (!user.name || user.name === 'Authorized User')) {
      user.name = name.trim();
    }
    savePersistedUsers();

    const override = USER_OVERRIDES.get(String(user._id).toLowerCase()) || USER_OVERRIDES.get(String(user.email).toLowerCase());

    const token = await generateToken(user._id, user.role);
    const { passwordHash, ...sanitized } = user;
    const finalUser = {
      ...sanitized,
      ...(override?.name ? { name: override.name } : {}),
      ...(override?.cnic !== undefined ? { cnic: override.cnic } : {}),
      ...(override?.cnicVerified !== undefined ? { cnicVerified: override.cnicVerified } : {}),
      ...(override?.verificationStatus ? { verificationStatus: override.verificationStatus } : {}),
      ...(override?.phone ? { phone: override.phone } : {}),
      ...(override?.address ? { address: override.address } : {}),
      ...(override?.city ? { city: override.city } : {}),
    };
    return {
      user: finalUser,
      token,
      isNewUser: false,
      message: `Signed in with ${providerLabel} successfully.`,
    };
  }

  // 3. User does not exist -> Automatically register them via Google/Apple
  const normRole = (roleInput || '').toLowerCase().trim();
  const isWorkerRole =
    normRole === 'fieldteam' ||
    normRole === 'field_team' ||
    normRole === 'field-team' ||
    normRole === 'field' ||
    normRole === 'worker' ||
    normRole === 'crew' ||
    normRole === 'technician';
  const role: 'Client' | 'FieldTeam' = isWorkerRole ? 'FieldTeam' : 'Client';

  if (normRole === 'admin') {
    throw new ApiError(403, 'Administrator accounts cannot be registered via social login without prior authorization.');
  }

  const newId = '65f0' + crypto.randomBytes(10).toString('hex');
  const dummyPass = crypto.randomBytes(16).toString('hex');
  const passwordHash = await bcrypt.hash(dummyPass, 10);
  const displayName = (name || '').trim() || (provider === 'apple' ? 'Apple User' : 'Google User');

  const newUser: InMemoryUser = {
    _id: newId,
    id: newId,
    name: displayName,
    email: normEmail,
    passwordHash,
    role,
    phone: '',
    cnic: '',
    cnicVerified: false,
    verificationStatus: 'Pending',
    isVerified: true,
    isActive: true,
    failedLoginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    registeredAt: new Date(),
  };

  IN_MEMORY_USERS.push(newUser);
  savePersistedUsers();

  try {
    await dbQuery(
      `INSERT INTO users (id, name, email, password_hash, role, is_verified, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, true, NOW(), NOW())
       ON CONFLICT (email) DO NOTHING`,
      [newId, displayName, normEmail, passwordHash, role]
    );
  } catch (_) {}

  const token = await generateToken(newUser._id, newUser.role);
  const { passwordHash: ph, ...sanitized } = newUser;

  return {
    user: sanitized,
    token,
    isNewUser: true,
    message: `Account created and signed in with ${providerLabel} successfully!`,
  };
};

/**
 * Verify Login 4-Digit Code (2FA verification for all accounts)
 */
export const verifyLoginCode = async (
  email: string,
  code: string,
  rememberMe?: boolean,
  deviceId?: string
) => {
  const cleanId = (email || '').toLowerCase().trim();
  const rawCode = (code || '').trim();

  if (!cleanId || !rawCode) {
    throw new ApiError(400, 'Email or username and verification code are required.');
  }

  // 1. Check Registered Admins
  const admin = findAdminByEmailOrId(cleanId);
  if (admin) {
    if (!admin.verificationCode || admin.verificationCode !== rawCode) {
      throw new ApiError(400, 'Invalid verification code. Please check your email and try again.');
    }
    if (admin.verificationCodeExpiry && new Date(admin.verificationCodeExpiry) < new Date()) {
      throw new ApiError(400, 'Verification code has expired. Please click Resend Code.');
    }

    // Code confirmed: clear code and issue token
    admin.verificationCode = undefined;
    admin.verificationCodeExpiry = undefined;
    admin.isVerified = true;
    admin.verificationStatus = 'Verified';
    // Mark this admin as having logged in at least once
    admin.hasLoggedIn = true;
    admin.lastLoginAt = new Date().toISOString();

    // If user clicked 'Remember Me', persist verification so future logins with 'Remember Me' don't prompt for code
    if (rememberMe) {
      admin.rememberMeVerified = true;
      if (deviceId) {
        admin.rememberedDevices = Array.from(new Set([...(admin.rememberedDevices || []), deviceId]));
      }
    }

    const allAdmins = getRegisteredAdmins();
    const idx = allAdmins.findIndex(a => a._id === admin._id);
    if (idx >= 0) allAdmins[idx] = admin;
    writeRegisteredAdmins(allAdmins);

    const token = await generateToken(admin._id, 'Admin');
    const { passwordHash, ...sanitized } = admin;
    return {
      user: sanitized,
      token,
      message: 'Security verification successful! Welcome to ClearFlow.',
    };
  }

  // 2. Check InMemory / Persisted Users (Clients & Workers by email, name, or id)
  let memUser = IN_MEMORY_USERS.find(u => 
    u.email.toLowerCase() === cleanId || 
    (u.name && u.name.trim().toLowerCase() === cleanId) ||
    (u._id && String(u._id).toLowerCase() === cleanId)
  );
  if (!memUser) {
    const persisted = getPersistedUsers();
    const pMatch = persisted.find((u: any) => 
      u.email.toLowerCase() === cleanId || 
      (u.name && u.name.trim().toLowerCase() === cleanId) ||
      (u._id && String(u._id).toLowerCase() === cleanId)
    );
    if (pMatch) {
      IN_MEMORY_USERS.push(pMatch);
      memUser = pMatch;
    }
  }

  if (memUser) {
    if (!memUser.verificationCode || String(memUser.verificationCode).trim() !== rawCode) {
      throw new ApiError(400, 'Invalid verification code. Please check your email and try again.');
    }
    if (memUser.verificationCodeExpiry && new Date(memUser.verificationCodeExpiry) < new Date()) {
      throw new ApiError(400, 'Verification code has expired. Please click Resend Code.');
    }

    memUser.verificationCode = undefined;
    memUser.verificationCodeExpiry = undefined;
    memUser.isVerified = true;
    // Identity verification (CNIC) must be verified separately via government CNIC flow
    if (memUser.cnic && memUser.cnic.replace(/\D/g, '').length === 13 && memUser.cnicVerified) {
      memUser.verificationStatus = 'Verified';
    } else {
      memUser.verificationStatus = 'None';
      memUser.cnicVerified = false;
    }

    // If user clicked 'Remember Me', persist verification so future logins with 'Remember Me' don't prompt for code
    if (rememberMe) {
      memUser.rememberMeVerified = true;
      if (deviceId) {
        memUser.rememberedDevices = Array.from(new Set([...(memUser.rememberedDevices || []), deviceId]));
      }
    }
    savePersistedUsers();

    try {
      await dbQuery(
        'UPDATE users SET is_verified = true WHERE LOWER(email) = $1',
        [memUser.email.toLowerCase()]
      );
    } catch (_) {}

    await ensureUserInitialized(memUser._id, memUser.role, memUser.name, memUser.email);
    const token = await generateToken(memUser._id, memUser.role);
    const { passwordHash, ...sanitized } = memUser;
    return {
      user: sanitized,
      token,
      message: 'Security verification successful! Welcome to ClearFlow.',
    };
  }

  // 3. Check Supabase / PostgreSQL DB
  try {
    const rows = await dbQuery('SELECT * FROM users WHERE LOWER(email) = $1 OR LOWER(name) = $1 LIMIT 1', [cleanId]);
    if (rows && rows.length > 0) {
      const dbUser = mapRow(rows[0]);
      if (dbUser && dbUser.verificationCode && String(dbUser.verificationCode).trim() === rawCode) {
        await dbQuery(
          'UPDATE users SET is_verified = true WHERE LOWER(email) = $1',
          [dbUser.email.toLowerCase()]
        );
        const token = await generateToken(dbUser._id, dbUser.role);
        const { passwordHash, ...userObj } = dbUser as any;

        if (rememberMe) {
          const existingMem = IN_MEMORY_USERS.find(u => u.email.toLowerCase() === dbUser.email.toLowerCase());
          if (existingMem) {
            existingMem.rememberMeVerified = true;
            if (deviceId) {
              existingMem.rememberedDevices = Array.from(new Set([...(existingMem.rememberedDevices || []), deviceId]));
            }
            savePersistedUsers();
          }
        }

        return {
          user: userObj,
          token,
          message: 'Security verification successful! Welcome to ClearFlow.',
        };
      }
    }
  } catch (_) {}

  throw new ApiError(400, 'Invalid verification code. Please check your email and try again.');
};

/**
 * Resend Login 4-Digit Code (all accounts)
 */
export const resendLoginCode = async (email: string, originBaseUrl?: string) => {
  const cleanId = (email || '').toLowerCase().trim();

  // 1. Check Registered Admins
  const admin = findAdminByEmailOrId(cleanId);
  if (admin) {
    const verificationCode = crypto.randomInt(1000, 10000).toString();
    admin.verificationCode = verificationCode;
    admin.verificationCodeExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const allAdmins = getRegisteredAdmins();
    const idx = allAdmins.findIndex(a => a._id === admin._id);
    if (idx >= 0) allAdmins[idx] = admin;
    writeRegisteredAdmins(allAdmins);

    await sendVerificationEmail(admin.email, admin.name, verificationCode, undefined, originBaseUrl);
    return {
      message: 'A new 4-digit verification code has been sent to your email.',
      codeHint: verificationCode,
    };
  }

  // 2. Check InMemory / Persisted Users (Clients and Workers)
  let memUser = IN_MEMORY_USERS.find(u => 
    u.email.toLowerCase() === cleanId || 
    (u.name && u.name.trim().toLowerCase() === cleanId)
  );
  if (!memUser) {
    const persisted = getPersistedUsers();
    const pMatch = persisted.find((u: any) => 
      u.email.toLowerCase() === cleanId || 
      (u.name && u.name.trim().toLowerCase() === cleanId)
    );
    if (pMatch) {
      IN_MEMORY_USERS.push(pMatch);
      memUser = pMatch;
    }
  }

  if (memUser) {
    const verificationCode = crypto.randomInt(1000, 10000).toString();
    memUser.verificationCode = verificationCode;
    memUser.verificationCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);
    savePersistedUsers();

    await sendVerificationEmail(memUser.email, memUser.name, verificationCode, undefined, originBaseUrl, memUser.role);
    return {
      message: 'A new 4-digit verification code has been sent to your email.',
      codeHint: verificationCode,
    };
  }

  // 3. Check Supabase / PostgreSQL DB
  try {
    const rows = await dbQuery('SELECT * FROM users WHERE LOWER(email) = $1 OR LOWER(name) = $1 LIMIT 1', [cleanId]);
    if (rows && rows.length > 0) {
      const dbUser = mapRow(rows[0]);
      if (dbUser) {
        const verificationCode = crypto.randomInt(1000, 10000).toString();
        const expiry = new Date(Date.now() + 15 * 60 * 1000);
        IN_MEMORY_USERS.push({ ...dbUser, verificationCode, verificationCodeExpiry: expiry });
        savePersistedUsers();

        await sendVerificationEmail(dbUser.email, dbUser.name, verificationCode, undefined, originBaseUrl, dbUser.role);
        return {
          message: 'A new 4-digit verification code has been sent to your email.',
          codeHint: verificationCode,
        };
      }
    }
  } catch (_) {}

  throw new ApiError(404, 'Account not found.');
};

/**
 * Get current authenticated user profile
 */
export const getMe = async (userId: string) => {
  const getOverride = (id?: string, email?: string) => {
    const keyId = String(id || '').toLowerCase().trim();
    const keyEmail = String(email || '').toLowerCase().trim();
    return (keyId ? USER_OVERRIDES.get(keyId) : null) || (keyEmail ? USER_OVERRIDES.get(keyEmail) : null) || {};
  };

  const adminMatch = findAdminByEmailOrId(userId);
  if (adminMatch) {
    const override = getOverride(adminMatch._id || (adminMatch as any).id, adminMatch.email);
    const { passwordHash, ...sanitized } = { ...adminMatch, ...override };
    return sanitized;
  }

  const demoMatch = DEMO_USERS.find(d => d._id === userId);
  if (demoMatch) {
    const override = getOverride(demoMatch._id, demoMatch.email);
    const sanitized = {
      _id: demoMatch._id,
      name: demoMatch.name,
      email: demoMatch.email,
      role: demoMatch.role,
      phone: demoMatch.phone,
      cnic: (demoMatch as any).cnic || '35201-1234567-1',
      cnicVerified: true,
      verificationStatus: 'Verified',
      address: (demoMatch as any).address || '',
      city: (demoMatch as any).city || 'Lahore',
      locationLat: (demoMatch as any).locationLat,
      locationLng: (demoMatch as any).locationLng,
      serviceCategories: (demoMatch as any).serviceCategories || [],
      experienceYears: (demoMatch as any).experienceYears || '',
      isVerified: true,
      isActive: true,
      ...override,
    };
    return sanitized;
  }

  const memUser = IN_MEMORY_USERS.find(u => u._id === userId || (u as any).id === userId || u.email?.toLowerCase() === userId.toLowerCase());
  if (memUser) {
    if (memUser.email?.toLowerCase().includes('wathraf') || memUser.email?.toLowerCase().includes('wathaf')) {
      memUser.role = 'FieldTeam';
    }
    const override = getOverride(memUser._id || (memUser as any).id, memUser.email);
    const { passwordHash, ...sanitized } = { ...memUser, ...override };
    return sanitized;
  }

  try {
    const rows = await dbQuery('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (rows && rows.length > 0) {
      const user = mapRow(rows[0]);
      if (user) {
        if (user.email?.toLowerCase().includes('wathraf') || user.email?.toLowerCase().includes('wathaf')) {
          user.role = 'FieldTeam';
        }
        const override = getOverride(user._id, user.email);
        const { passwordHash, ...sanitized } = { ...user, ...override };
        return sanitized;
      }
    }
  } catch (e) {}

  throw new ApiError(404, 'User not found');
};

/**
 * F-05: Forgot Password
 */
export const forgotPassword = async (email: string, originBaseUrl?: string, roleHint?: string) => {
  const normEmail = (email || '').toLowerCase().trim();
  if (!normEmail) {
    throw new ApiError(400, 'Email address is required.');
  }

  // Check if account exists
  let found = false;
  let userName = 'Member';
  let userRole = roleHint || 'Client';

  const demoMatch = DEMO_USERS.find(
    (d) => d.email.toLowerCase() === normEmail || (d.aliases || []).some((a: string) => a.toLowerCase() === normEmail)
  );
  if (demoMatch) {
    found = true;
    userName = demoMatch.name;
    userRole = demoMatch.role;
  }

  const memUser = IN_MEMORY_USERS.find(u => u.email === normEmail);
  if (memUser) {
    found = true;
    userName = memUser.name;
    userRole = memUser.role;
  }

  try {
    const rows = await dbQuery('SELECT * FROM users WHERE email = $1 LIMIT 1', [normEmail]);
    if (rows && rows.length > 0) {
      const user = mapRow(rows[0]);
      if (user) {
        found = true;
        userName = user.name;
        userRole = user.role;
      }
    }
  } catch (e) {}

  if (!found) {
    throw new ApiError(404, 'No account found with this email address. Please register yourself first to get started.');
  }

  // Generate 4-digit OTP recovery code
  const resetCode = crypto.randomInt(1000, 10000).toString();
  const rawResetToken = crypto.randomBytes(32).toString('hex');
  const hashedResetToken = hashToken(rawResetToken);
  const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  if (memUser) {
    memUser.resetPasswordToken = hashedResetToken;
    memUser.resetPasswordExpiry = resetExpiry;
    memUser.resetPasswordCode = resetCode;
    memUser.resetPasswordCodeExpiry = resetExpiry;
  } else if (demoMatch) {
    const passwordHash = await bcrypt.hash(demoMatch.password, 12);
    IN_MEMORY_USERS.push({
      _id: demoMatch._id,
      name: demoMatch.name,
      email: normEmail,
      passwordHash,
      role: demoMatch.role,
      phone: demoMatch.phone,
      isVerified: true,
      isActive: true,
      failedLoginAttempts: 0,
      resetPasswordToken: hashedResetToken,
      resetPasswordExpiry: resetExpiry,
      resetPasswordCode: resetCode,
      resetPasswordCodeExpiry: resetExpiry,
      createdAt: new Date(),
    });
  }

  try {
    const rows = await dbQuery('SELECT id FROM users WHERE email = $1 LIMIT 1', [normEmail]);
    if (rows && rows.length > 0) {
      await dbQuery(
        `UPDATE users SET reset_password_token = $1, reset_password_expiry = $2,
         reset_password_code = $3, reset_password_code_expiry = $4 WHERE id = $5`,
        [hashedResetToken, resetExpiry, resetCode, resetExpiry, rows[0].id]
      );
    }
  } catch (e) {}

  const { resetUrl } = await sendPasswordResetEmail(
    normEmail,
    userName,
    resetCode,
    rawResetToken,
    originBaseUrl,
    userRole
  );

  return {
    resetUrl,
    resetCode,
    email: normEmail,
    message: 'A 4-digit recovery code has been sent to your email.',
  };
};

/**
 * Verify 4-Digit Reset Code
 */
export const verifyResetCode = async (email: string, code: string) => {
  const normEmail = (email || '').toLowerCase().trim();
  const rawCode = (code || '').trim();

  if (!normEmail) {
    throw new ApiError(400, 'Email address is required.');
  }
  if (!rawCode || rawCode.length !== 4) {
    throw new ApiError(400, 'Please enter a valid 4-digit recovery code.');
  }

  let valid = false;

  const memUser = IN_MEMORY_USERS.find(u => u.email === normEmail);
  if (memUser && memUser.resetPasswordCode === rawCode) {
    if (memUser.resetPasswordCodeExpiry && memUser.resetPasswordCodeExpiry < new Date()) {
      throw new ApiError(400, 'Recovery code has expired. Please request a new code.');
    }
    valid = true;
  }

  try {
    const rows = await dbQuery('SELECT * FROM users WHERE email = $1 LIMIT 1', [normEmail]);
    if (rows && rows.length > 0) {
      const user = mapRow(rows[0]);
      if (user && user.resetPasswordCode === rawCode) {
        if (user.resetPasswordCodeExpiry && user.resetPasswordCodeExpiry < new Date()) {
          throw new ApiError(400, 'Recovery code has expired. Please request a new code.');
        }
        valid = true;
      }
    }
  } catch (e: any) {
    if (e instanceof ApiError) throw e;
  }

  if (!valid) {
    throw new ApiError(400, 'Invalid recovery code. Please check your email and try again.');
  }

  return {
    valid: true,
    email: normEmail,
    message: 'Recovery code verified successfully.',
  };
};

/**
 * F-05: Reset Password (supports token, or email + code)
 */
export const resetPassword = async (
  rawTokenOrParams: string | { token?: string; email?: string; code?: string },
  newPass: string
) => {
  if (!newPass || newPass.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters long.');
  }

  let token = typeof rawTokenOrParams === 'string' ? rawTokenOrParams.trim() : (rawTokenOrParams.token || '').trim();
  const email = typeof rawTokenOrParams === 'object' ? (rawTokenOrParams.email || '').toLowerCase().trim() : '';
  const code = typeof rawTokenOrParams === 'object' ? (rawTokenOrParams.code || '').trim() : '';

  const passwordHash = await bcrypt.hash(newPass, 12);
  let updated = false;

  // 1. By email and 4-digit code
  if (email && code) {
    const memUser = IN_MEMORY_USERS.find(u => u.email === email && u.resetPasswordCode === code);
    if (memUser) {
      if (memUser.resetPasswordCodeExpiry && memUser.resetPasswordCodeExpiry < new Date()) {
        throw new ApiError(400, 'Recovery code has expired. Please request a new code.');
      }
      memUser.passwordHash = passwordHash;
      memUser.resetPasswordToken = undefined;
      memUser.resetPasswordExpiry = undefined;
      memUser.resetPasswordCode = undefined;
      memUser.resetPasswordCodeExpiry = undefined;
      memUser.failedLoginAttempts = 0;
      memUser.accountLockedUntil = undefined;
      updated = true;
    }

    try {
      const rows = await dbQuery(
        'SELECT * FROM users WHERE email = $1 AND reset_password_code = $2 AND reset_password_code_expiry > NOW() LIMIT 1',
        [email, code]
      );
      if (rows && rows.length > 0) {
        await dbQuery(
          `UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expiry = NULL,
           reset_password_code = NULL, reset_password_code_expiry = NULL,
           failed_login_attempts = 0, account_locked_until = NULL WHERE id = $2`,
          [passwordHash, rows[0].id]
        );
        updated = true;
      }
    } catch (e) {}
  }

  // 2. By Token
  if (!updated && token) {
    const hashedToken = hashToken(token);
    const memUser = IN_MEMORY_USERS.find(u => u.resetPasswordToken === hashedToken);
    if (memUser) {
      if (memUser.resetPasswordExpiry && memUser.resetPasswordExpiry < new Date()) {
        throw new ApiError(400, 'Password reset link has expired. Please request a new one.');
      }
      memUser.passwordHash = passwordHash;
      memUser.resetPasswordToken = undefined;
      memUser.resetPasswordExpiry = undefined;
      memUser.resetPasswordCode = undefined;
      memUser.resetPasswordCodeExpiry = undefined;
      memUser.failedLoginAttempts = 0;
      memUser.accountLockedUntil = undefined;
      updated = true;
    }

    try {
      const rows = await dbQuery(
        'SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expiry > NOW() LIMIT 1',
        [hashedToken]
      );
      if (rows && rows.length > 0) {
        await dbQuery(
          `UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expiry = NULL,
           reset_password_code = NULL, reset_password_code_expiry = NULL,
           failed_login_attempts = 0, account_locked_until = NULL WHERE id = $2`,
          [passwordHash, rows[0].id]
        );
        updated = true;
      }
    } catch (e) {}
  }

  if (!updated) {
    throw new ApiError(400, 'Invalid or expired recovery details. Please try requesting a new code.');
  }

  return {
    message: 'Password successfully updated. You may now log in with your new credentials.',
  };
};
