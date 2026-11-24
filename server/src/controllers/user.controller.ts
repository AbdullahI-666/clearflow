import { Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { AuthRequest, generateToken } from '../middleware/auth.middleware.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { DEMO_USERS, IN_MEMORY_USERS, savePersistedUsers } from '../services/auth.service.js';
import { getRegisteredAdmins, setPrimaryAdmin as setPrimaryAdminService, findAdminByEmailOrId, writeRegisteredAdmins } from '../services/admin.service.js';
import { dbQuery } from '../config/db.js';
import { sendVerificationEmail } from '../services/email.service.js';
import { removeTrackingForUser } from '../services/gpsTracking.service.js';
import { getIo, emitUserUpdated, emitCompanyUpdated } from '../socket/index.js';
import { DELETED_USER_IDS, isUserDeleted, persistDeletedUsers } from '../utils/deletedUsers.js';
import { DEFAULT_TEAMS_DATA } from './team.controller.js';
import { MOCK_WORK_ORDERS } from '../services/workOrder.service.js';
import { getOrCreateWallet } from '../services/marketplace.service.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const USER_OVERRIDES_FILE = path.join(DATA_DIR, 'user_overrides.json');
const DELETED_USERS_FILE = path.join(DATA_DIR, 'deleted_users.json');

import { USER_OVERRIDES, persistUserOverrides } from '../utils/userOverrides.js';

export { DELETED_USER_IDS, isUserDeleted, persistDeletedUsers, USER_OVERRIDES, persistUserOverrides };

export const resolveOperationsDisplayId = (user: { id?: string; _id?: string; name?: string; email?: string }, isClient: boolean): string => {
  const name = (user.name || '').trim().toLowerCase();
  const email = (user.email || '').trim().toLowerCase();
  const idStr = String(user._id || user.id || '');

  if (isClient) {
    if (name === 'ali' || name.startsWith('ali ') || email === 'ahsankhalid8657@gmail.com' || idStr.includes('ofpt') || idStr.toLowerCase() === 'c#01') {
      return 'C#01';
    }
    if (idStr.startsWith('C#')) return idStr;
    return `C#${idStr.slice(-4)}`;
  } else {
    if (name === 'ahmad' || name.startsWith('ahmad ') || email === 'ahsankhalid8796@gmail.com' || idStr.includes('ftx8') || idStr.toLowerCase() === 'w#01') {
      return 'W#01';
    }
    if (idStr.startsWith('W#')) return idStr;
    return `W#${idStr.slice(-4)}`;
  }
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
  }
}

export function loadPersistedUserData() {
  try {
    ensureDataDir();
    if (fs.existsSync(DELETED_USERS_FILE)) {
      const raw = fs.readFileSync(DELETED_USERS_FILE, 'utf-8');
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach(id => {
          if (id) {
            const norm = String(id).toLowerCase().trim();
            DELETED_USER_IDS.add(norm);
            const stripped = norm.replace(/^[acw]#/i, '');
            if (stripped) DELETED_USER_IDS.add(stripped);
          }
        });
      }
    }
    if (fs.existsSync(USER_OVERRIDES_FILE)) {
      const raw = fs.readFileSync(USER_OVERRIDES_FILE, 'utf-8');
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object') {
        Object.entries(obj).forEach(([k, v]) => {
          USER_OVERRIDES.set(k.toLowerCase().trim(), v);
        });
      }
    }
  } catch (err) {
    console.error('Failed to load persisted user state:', err);
  }
}

function saveDeletedUsers() {
  persistDeletedUsers();
}

loadPersistedUserData();

export const matchesTargetUser = (u: any, targetId: string): boolean => {
  if (!u || !targetId) return false;
  const tid = targetId.trim();
  if (u._id === tid || (u as any).id === tid) return true;
  if (u.email && u.email.toLowerCase() === tid.toLowerCase()) return true;
  if (u.name && u.name.toLowerCase() === tid.toLowerCase()) return true;
  const stripped = tid.replace(/^[ACW]#/i, '');
  if (stripped && (String(u._id).endsWith(stripped) || (u as any).id === tid || String((u as any).id).endsWith(stripped))) return true;
  return false;
};

export const isDefaultAdminUser = (userIdOrEmail?: string): boolean => {
  if (!userIdOrEmail) return false;
  const val = String(userIdOrEmail).toLowerCase().trim();
  return val === '65f000000000000000000001' || 
         val === 'admin@clearflow.com' || 
         val === 'admin@clearflow.pk' ||
         val === 'ahsankhalid9768@gmail.com' ||
         val === 'abdullahikram666@gmail.com' ||
         val === 'adm_primary_ahsan' ||
         val === 'adm_secondary_abdullah' ||
         val === 'a#0001' ||
         val === 'a#0002';
};

export const checkIsCallerDefaultAdmin = (req: AuthRequest): boolean => {
  const callerId = req.user?.userId ? String(req.user.userId) : '';
  const callerEmail = (req.user as any)?.email ? String((req.user as any).email) : '';
  if (!callerId && !callerEmail) return false;
  if (isDefaultAdminUser(callerId) || isDefaultAdminUser(callerEmail)) return true;
  const adminCaller = (callerId ? findAdminByEmailOrId(callerId) : undefined) || 
                      (callerEmail ? findAdminByEmailOrId(callerEmail) : undefined);
  if (adminCaller) return true;
  const caller = DEMO_USERS.find(d => matchesTargetUser(d, callerId)) ||
                 IN_MEMORY_USERS.find(u => matchesTargetUser(u, callerId));
  return isDefaultAdminUser(caller?.email);
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  const rawId = (req.params.id === 'me' ? req.user?.userId : req.params.id) || req.user?.userId || '';
  const userId = Array.isArray(rawId) ? rawId[0] : String(rawId);

  const getOverride = (id?: string, email?: string) => {
    const keyId = String(id || '').toLowerCase().trim();
    const keyEmail = String(email || '').toLowerCase().trim();
    return (keyId ? USER_OVERRIDES.get(keyId) : null) || (keyEmail ? USER_OVERRIDES.get(keyEmail) : null) || {};
  };

  // 1. Check Registered Administrators
  const adminMatch = findAdminByEmailOrId(userId);
  if (adminMatch) {
    const override = getOverride(adminMatch._id || (adminMatch as any).id, adminMatch.email);
    const { passwordHash, ...sanitized } = { ...adminMatch, ...override };
    return res.json(ApiResponse.success(sanitized, 'User profile retrieved'));
  }

  const demoMatch = DEMO_USERS.find(d => d._id === userId);
  if (demoMatch) {
    const override = getOverride(demoMatch._id, demoMatch.email);
    return res.json(ApiResponse.success({
      _id: demoMatch._id,
      name: demoMatch.name,
      email: demoMatch.email,
      role: demoMatch.role,
      phone: demoMatch.phone,
      isVerified: true,
      isActive: true,
      ...override,
    }, 'User profile retrieved'));
  }

  const memUser = IN_MEMORY_USERS.find(u => matchesTargetUser(u, userId));
  if (memUser) {
    const override = getOverride(memUser._id || (memUser as any).id, memUser.email);
    const { passwordHash, ...sanitized } = { ...memUser, ...override };
    return res.json(ApiResponse.success(sanitized, 'User profile retrieved'));
  }

  try {
    const rows = await dbQuery('SELECT * FROM users WHERE id::text = $1 OR LOWER(email) = LOWER($1) LIMIT 1', [userId]);
    if (rows && rows.length > 0) {
      const { password_hash, ...sanitized } = rows[0];
      return res.json(ApiResponse.success(sanitized, 'User profile retrieved'));
    }
  } catch (_) {}

  throw new ApiError(404, 'User not found');
};

const SERVER_PRESET_LOCATIONS: Array<{ keys: string[]; lat: number; lng: number }> = [
  { keys: ['ali town', 'ali towm'], lat: 31.4620, lng: 74.2458 },
  { keys: ['canal view', 'canalview'], lat: 31.4880, lng: 74.2480 },
  { keys: ['muslim town', 'crystal boys'], lat: 31.5104, lng: 74.3068 },
  { keys: ['wahdat'], lat: 31.5060, lng: 74.2980 },
  { keys: ['johar town', 'johar'], lat: 31.4697, lng: 74.2728 },
  { keys: ['emporium', 'block h-3', 'block h3'], lat: 31.4678, lng: 74.2662 },
  { keys: ['expo centre', 'expo center'], lat: 31.4655, lng: 74.2640 },
  { keys: ['azimabad', 'azeemabad', 'azeem abad'], lat: 31.4600, lng: 74.2380 },
  { keys: ['thokar'], lat: 31.4700, lng: 74.2400 },
  { keys: ['gulberg'], lat: 31.5126, lng: 74.3465 },
  { keys: ['model town'], lat: 31.4883, lng: 74.3216 },
  { keys: ['dha phase 6'], lat: 31.4550, lng: 74.4420 },
  { keys: ['dha phase 5', 'dha'], lat: 31.4650, lng: 74.4050 },
  { keys: ['wapda town', 'wapda'], lat: 31.4350, lng: 74.2650 },
  { keys: ['valencia'], lat: 31.4150, lng: 74.2600 },
  { keys: ['bahria'], lat: 31.3650, lng: 74.1800 },
  { keys: ['iqbal town'], lat: 31.5150, lng: 74.2850 },
  { keys: ['cantt', 'cavalry'], lat: 31.5050, lng: 74.3750 },
  { keys: ['lake city'], lat: 31.3800, lng: 74.2500 },
  { keys: ['garden town', 'barkat market'], lat: 31.5020, lng: 74.3280 },
  { keys: ['township'], lat: 31.4550, lng: 74.3050 },
  { keys: ['central facility', 'central operations'], lat: 31.5204, lng: 74.3587 },
];

export const updateProfile = async (req: AuthRequest, res: Response) => {
  const rawTargetId = (req.params.id === 'me' ? req.user?.userId : req.params.id) || req.user?.userId || '';
  const targetId = Array.isArray(rawTargetId) ? rawTargetId[0] : String(rawTargetId);
  const callerId = req.user?.userId ? String(req.user.userId) : '';
  const callerRole = req.user?.role;
  const callerEmail = (req.user as any)?.email ? String((req.user as any).email) : '';

  const isTargetingSelf = 
    req.params.id === 'me' ||
    targetId === 'me' ||
    targetId === callerId ||
    (Boolean(callerEmail) && targetId.toLowerCase() === callerEmail.toLowerCase()) ||
    (Boolean(callerId) && (targetId === findAdminByEmailOrId(callerId)?._id || targetId === findAdminByEmailOrId(callerId)?.id));

  // Only allow updating own profile unless Admin
  if (!isTargetingSelf && callerRole !== 'Admin') {
    throw new ApiError(403, 'Unauthorized to modify another user profile');
  }

  const { 
    name, 
    email,
    newEmail,
    phone, 
    address, 
    city, 
    locationLat,
    locationLng,
    avatar, 
    avatarUrl, 
    profilePicture, 
    companyName, 
    experienceYears, 
    serviceCategories, 
    bio, 
    currentPassword, 
    newPassword 
  } = req.body;

  const targetNewEmail = (newEmail || email ? String(newEmail || email).toLowerCase().trim() : undefined);

  if (targetNewEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetNewEmail)) {
      throw new ApiError(400, 'Invalid email format. Please check your email address.');
    }
    const knownTypos: Record<string, string> = {
      'gmai.com': 'gmail.com',
      'gmial.com': 'gmail.com',
      'gamil.com': 'gmail.com',
      'gmal.com': 'gmail.com',
      'gmaill.com': 'gmail.com',
      'gmaii.com': 'gmail.com',
      'gmail.co': 'gmail.com',
      'gmail.cm': 'gmail.com',
      'gma.com': 'gmail.com',
      'hotmial.com': 'hotmail.com',
      'hotmal.com': 'hotmail.com',
      'hotmai.com': 'hotmail.com',
      'outlok.com': 'outlook.com',
      'outloo.com': 'outlook.com',
      'yaho.com': 'yahoo.com',
      'yahooo.com': 'yahoo.com',
      'clearflo.com': 'clearflow.com',
      'clearfloww.com': 'clearflow.com',
      'clerflow.com': 'clearflow.com',
    };
    const domainPart = targetNewEmail.split('@')[1];
    if (domainPart && knownTypos[domainPart]) {
      throw new ApiError(400, `Wrong domain "@${domainPart}". Did you mean "@${knownTypos[domainPart]}"? Please fix it to continue.`);
    }
  }

  const resolvedAvatar = avatar || avatarUrl || profilePicture;

  let resolvedLatNum = locationLat !== undefined ? Number(locationLat) : undefined;
  let resolvedLngNum = locationLng !== undefined ? Number(locationLng) : undefined;

  if (address && typeof address === 'string') {
    const cleanAddrLower = address.toLowerCase();
    const matchedPreset = SERVER_PRESET_LOCATIONS.find(p => p.keys.some(k => cleanAddrLower.includes(k)));
    if (matchedPreset) {
      if (resolvedLatNum === undefined || isNaN(resolvedLatNum) || Math.abs(resolvedLatNum - matchedPreset.lat) > 0.003) {
        resolvedLatNum = matchedPreset.lat;
        resolvedLngNum = matchedPreset.lng;
      }
    }
  }

  // Helper to cross-sync profile updates across shared operational entities
  const syncSharedEntities = (userObj: any) => {
    try {
      const uName = userObj.name;
      const uPhone = userObj.phone;
      const uAddress = userObj.address;
      const uLat = resolvedLatNum !== undefined ? resolvedLatNum : userObj.locationLat;
      const uLng = resolvedLngNum !== undefined ? resolvedLngNum : userObj.locationLng;
      const uEmail = userObj.email;
      const uRole = userObj.role;

      // 1. If Worker: sync with DEFAULT_TEAMS_DATA
      if (uRole === 'FieldTeam') {
        DEFAULT_TEAMS_DATA.forEach(t => {
          if (t.workerId === userObj.id || t.workerName === uName || t.members?.some((m: any) => m._id === targetId || m.email === uEmail)) {
            if (uName) t.workerName = uName;
            if (uAddress) t.zoneAddress = uAddress;
            if (uLat && uLng) {
              t.zoneLat = uLat;
              t.zoneLng = uLng;
            }
            t.members?.forEach((m: any) => {
              if (m._id === targetId || m.email === uEmail) {
                if (uName) m.name = uName;
                if (uPhone) m.phone = uPhone;
                if (uAddress) (m as any).address = uAddress;
                if (uLat && uLng) {
                  (m as any).locationLat = uLat;
                  (m as any).locationLng = uLng;
                }
              }
            });
          }
        });
        if (uLat && uLng) {
          dbQuery('UPDATE field_teams SET zone_lat = $1, zone_lng = $2 WHERE name ILIKE $3 OR id::text = $4', [uLat, uLng, `%${uName}%`, targetId]).catch(() => {});
        }
      }

      // 2. If Client: sync with assigned clients & work orders
      if (uRole === 'Client') {
        DEFAULT_TEAMS_DATA.forEach(t => {
          if (t.assignedClient && (t.assignedClient.clientId === userObj.id || t.assignedClient.name?.toLowerCase() === uName?.toLowerCase())) {
            if (uName) t.assignedClient.name = uName;
            if (uAddress) t.assignedClient.address = uAddress;
            if (uLat && uLng) {
              t.assignedClient.lat = uLat;
              t.assignedClient.lng = uLng;
            }
          }
        });
        MOCK_WORK_ORDERS.forEach(w => {
          const cId = typeof w.clientId === 'object' && w.clientId ? (w.clientId as any)._id : w.clientId;
          if (String(cId) === String(targetId) || (w.clientId as any)?.email === uEmail) {
            if (uName && typeof w.clientId === 'object') (w.clientId as any).name = uName;
            if (uPhone && typeof w.clientId === 'object') (w.clientId as any).phone = uPhone;
            if (uAddress) w.locationAddress = uAddress;
            if (uLat && uLng) {
              w.locationLat = uLat;
              w.locationLng = uLng;
            }
          }
        });
        if (uAddress && uLat && uLng) {
          dbQuery('UPDATE work_orders SET location_address = $1, location_lat = $2, location_lng = $3 WHERE client_id::text = $4', [uAddress, uLat, uLng, targetId]).catch(() => {});
        }
      }

      // 3. Save to USER_OVERRIDES for permanent multi-key persistence
      const updatedOverride = {
        ...(uName ? { name: uName } : {}),
        ...(uPhone !== undefined ? { phone: uPhone } : {}),
        ...(uAddress !== undefined ? { address: uAddress } : {}),
        ...(city !== undefined ? { city } : {}),
        ...(uLat !== undefined ? { locationLat: uLat } : {}),
        ...(uLng !== undefined ? { locationLng: uLng } : {}),
        ...(resolvedAvatar ? { avatar: resolvedAvatar, avatarUrl: resolvedAvatar } : {}),
        ...(companyName ? { companyName: companyName.trim() } : {}),
        ...(experienceYears ? { experienceYears } : {}),
        ...(Array.isArray(serviceCategories) ? { serviceCategories } : {}),
      };

      const keysToSave = [targetId, userObj._id, (userObj as any).id, uEmail, uName].filter(Boolean);
      keysToSave.forEach(k => {
        const cleanK = String(k).toLowerCase().trim();
        const existing = USER_OVERRIDES.get(cleanK) || {};
        USER_OVERRIDES.set(cleanK, { ...existing, ...updatedOverride });
      });
      persistUserOverrides();
      savePersistedUsers();
    } catch (e) {
      console.warn('Cross-entity profile sync notice:', e);
    }
  };

  // 1. Check Registered Administrators
  let existingAdmin = findAdminByEmailOrId(targetId);
  if (!existingAdmin && (isTargetingSelf || callerRole === 'Admin')) {
    if (callerId) existingAdmin = findAdminByEmailOrId(callerId);
    if (!existingAdmin && callerEmail) existingAdmin = findAdminByEmailOrId(callerEmail);
  }

  if (existingAdmin) {
    if (name && typeof name === 'string') existingAdmin.name = name.trim();
    if (phone !== undefined) existingAdmin.phone = typeof phone === 'string' ? phone.trim() : '';
    if (address !== undefined) existingAdmin.address = typeof address === 'string' ? address.trim() : '';
    if (city !== undefined) existingAdmin.city = typeof city === 'string' ? city.trim() : '';
    if (resolvedLatNum !== undefined) existingAdmin.locationLat = resolvedLatNum;
    if (resolvedLngNum !== undefined) existingAdmin.locationLng = resolvedLngNum;
    if (resolvedAvatar && typeof resolvedAvatar === 'string') {
      (existingAdmin as any).avatar = resolvedAvatar.trim();
      (existingAdmin as any).avatarUrl = resolvedAvatar.trim();
    }
    if (companyName && typeof companyName === 'string') {
      (existingAdmin as any).companyName = companyName.trim();
    }
    if (experienceYears && typeof experienceYears === 'string') {
      existingAdmin.experienceYears = experienceYears.trim();
    }
    if (Array.isArray(serviceCategories)) {
      existingAdmin.serviceCategories = serviceCategories;
    }

    const origAdminEmail = existingAdmin.email.toLowerCase();
    let isCurrentPasswordVerified = false;

    if (targetNewEmail && targetNewEmail !== origAdminEmail) {
      const adminConflict = findAdminByEmailOrId(targetNewEmail);
      if (adminConflict && adminConflict._id !== existingAdmin._id) {
        throw new ApiError(409, 'This email address is already in use by another administrator.');
      }
      const memConflict = IN_MEMORY_USERS.find(u => u.email.toLowerCase() === targetNewEmail && u._id !== existingAdmin._id);
      if (memConflict) {
        throw new ApiError(409, 'This email address is already in use by another account.');
      }

      if (callerId === existingAdmin._id || callerId === existingAdmin.id || callerEmail?.toLowerCase() === origAdminEmail) {
        if (!currentPassword) {
          throw new ApiError(400, 'Current password is required to change your email address');
        }
        const isMatch = await bcrypt.compare(currentPassword, existingAdmin.passwordHash);
        if (!isMatch) {
          throw new ApiError(400, 'Current password is incorrect');
        }
        isCurrentPasswordVerified = true;
      }

      existingAdmin.email = targetNewEmail;
    }

    if (newPassword) {
      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        throw new ApiError(400, 'New password must be at least 6 characters long');
      }
      if (callerId === existingAdmin._id || callerId === existingAdmin.id || callerEmail?.toLowerCase() === origAdminEmail || callerEmail?.toLowerCase() === existingAdmin.email.toLowerCase()) {
        if (!isCurrentPasswordVerified) {
          if (!currentPassword) {
            throw new ApiError(400, 'Current password is required to change password');
          }
          const isMatch = await bcrypt.compare(currentPassword, existingAdmin.passwordHash);
          if (!isMatch) {
            throw new ApiError(400, 'Current password is incorrect');
          }
          isCurrentPasswordVerified = true;
        }
      }
      existingAdmin.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    existingAdmin.updatedAt = new Date().toISOString();

    const allAdmins = getRegisteredAdmins();
    const idx = allAdmins.findIndex(a => a._id === existingAdmin!._id || a.email.toLowerCase() === existingAdmin!.email.toLowerCase());
    if (idx >= 0) {
      allAdmins[idx] = existingAdmin;
    } else {
      allAdmins.push(existingAdmin);
    }
    writeRegisteredAdmins(allAdmins);

    const { passwordHash, ...sanitized } = existingAdmin;
    syncSharedEntities(existingAdmin);
    emitUserUpdated(sanitized);

    emitCompanyUpdated({ 
      companyName: sanitized.name, 
      phone: sanitized.phone, 
      address: sanitized.address,
      companyIcon: (sanitized as any).avatar || (sanitized as any).avatarUrl,
      operationalInfo: `${sanitized.name} Facility Operations`,
    });

    const refreshedToken = await generateToken(existingAdmin._id, existingAdmin.role);
    return res.json(ApiResponse.success({ ...sanitized, token: refreshedToken }, 'Profile updated successfully'));
  }

  // 2. Check demo user
  const demoMatch = DEMO_USERS.find(d => matchesTargetUser(d, targetId));
  if (demoMatch) {
    if (name && typeof name === 'string') demoMatch.name = name.trim();
    if (phone && typeof phone === 'string') demoMatch.phone = phone.trim();
    if (address && typeof address === 'string') demoMatch.address = address.trim();
    if (city && typeof city === 'string') demoMatch.city = city.trim();
    if (resolvedLatNum !== undefined) demoMatch.locationLat = resolvedLatNum;
    if (resolvedLngNum !== undefined) demoMatch.locationLng = resolvedLngNum;
    if (resolvedAvatar && typeof resolvedAvatar === 'string') {
      (demoMatch as any).avatar = resolvedAvatar.trim();
      (demoMatch as any).avatarUrl = resolvedAvatar.trim();
    }
    if (experienceYears && typeof experienceYears === 'string') demoMatch.experienceYears = experienceYears.trim();
    if (Array.isArray(serviceCategories)) demoMatch.serviceCategories = serviceCategories;

    if (newPassword) {
      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        throw new ApiError(400, 'New password must be at least 6 characters long');
      }
      if (callerId === targetId) {
        if (!currentPassword || currentPassword !== demoMatch.password) {
          throw new ApiError(400, 'Current password is incorrect');
        }
      }
      demoMatch.password = newPassword;
    }

    const updatedDemo = {
      _id: demoMatch._id,
      name: demoMatch.name,
      email: demoMatch.email,
      role: demoMatch.role,
      phone: demoMatch.phone,
      address: demoMatch.address,
      city: demoMatch.city,
      locationLat: demoMatch.locationLat,
      locationLng: demoMatch.locationLng,
      avatar: (demoMatch as any).avatar,
      avatarUrl: (demoMatch as any).avatarUrl,
      isVerified: true,
      isActive: true,
    };

    syncSharedEntities(demoMatch);
    emitUserUpdated(updatedDemo);

    if ((demoMatch as any).role === 'Admin') {
      emitCompanyUpdated({ 
        companyName: demoMatch.name, 
        phone: demoMatch.phone, 
        address: demoMatch.address,
        companyIcon: (demoMatch as any).avatar || (demoMatch as any).avatarUrl,
        operationalInfo: `${demoMatch.name} Facility Operations`,
      });
    }

    return res.json(ApiResponse.success(updatedDemo, 'Profile updated successfully'));
  }

  // 3. Check in-memory registered user
  const memUser = IN_MEMORY_USERS.find(u => matchesTargetUser(u, targetId));
  if (memUser) {
    if (name && typeof name === 'string') memUser.name = name.trim();
    if (phone !== undefined) memUser.phone = typeof phone === 'string' ? phone.trim() : '';
    if (address !== undefined) memUser.address = typeof address === 'string' ? address.trim() : '';
    if (city !== undefined) memUser.city = typeof city === 'string' ? city.trim() : '';
    if (resolvedLatNum !== undefined) memUser.locationLat = resolvedLatNum;
    if (resolvedLngNum !== undefined) memUser.locationLng = resolvedLngNum;
    if (resolvedAvatar && typeof resolvedAvatar === 'string') {
      (memUser as any).avatar = resolvedAvatar.trim();
      (memUser as any).avatarUrl = resolvedAvatar.trim();
    }
    if (experienceYears && typeof experienceYears === 'string') memUser.experienceYears = experienceYears.trim();
    if (Array.isArray(serviceCategories)) memUser.serviceCategories = serviceCategories;

    const origMemEmail = memUser.email.toLowerCase();
    let isMemCurrentPasswordVerified = false;

    if (targetNewEmail && targetNewEmail !== origMemEmail) {
      const adminConflict = findAdminByEmailOrId(targetNewEmail);
      if (adminConflict) {
        throw new ApiError(409, 'This email address is already in use by an administrator.');
      }
      const memConflict = IN_MEMORY_USERS.find(u => u.email.toLowerCase() === targetNewEmail && u._id !== memUser._id);
      if (memConflict) {
        throw new ApiError(409, 'This email address is already in use by another account.');
      }

      if (callerId === memUser._id || callerId === (memUser as any).id || callerEmail?.toLowerCase() === origMemEmail) {
        if (!currentPassword) {
          throw new ApiError(400, 'Current password is required to change your email address');
        }
        const isMatch = await bcrypt.compare(currentPassword, memUser.passwordHash);
        if (!isMatch) {
          throw new ApiError(400, 'Current password is incorrect');
        }
        isMemCurrentPasswordVerified = true;
      }

      memUser.email = targetNewEmail;
    }

    if (newPassword) {
      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        throw new ApiError(400, 'New password must be at least 6 characters long');
      }
      if (callerId === memUser._id || callerId === (memUser as any).id || callerEmail?.toLowerCase() === origMemEmail || callerEmail?.toLowerCase() === memUser.email?.toLowerCase()) {
        if (!isMemCurrentPasswordVerified) {
          if (!currentPassword) {
            throw new ApiError(400, 'Current password is required to change password');
          }
          const isMatch = await bcrypt.compare(currentPassword, memUser.passwordHash);
          if (!isMatch) {
            throw new ApiError(400, 'Current password is incorrect');
          }
          isMemCurrentPasswordVerified = true;
        }
      }
      memUser.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    savePersistedUsers();

    const { passwordHash, ...sanitized } = memUser;
    syncSharedEntities(memUser);
    emitUserUpdated(sanitized);

    if (sanitized.role === 'Admin') {
      emitCompanyUpdated({ 
        companyName: sanitized.name, 
        phone: sanitized.phone, 
        address: sanitized.address,
        companyIcon: (sanitized as any).avatar || (sanitized as any).avatarUrl,
        operationalInfo: `${sanitized.name} Facility Operations`,
      });
    }

    const refreshedToken = await generateToken(memUser._id, memUser.role);
    return res.json(ApiResponse.success({ ...sanitized, token: refreshedToken }, 'Profile updated successfully'));
  }

  // 3. Update Supabase PostgreSQL
  try {
    const rows = await dbQuery('SELECT * FROM users WHERE id::text = $1 LIMIT 1', [targetId]);
    if (rows && rows.length > 0) {
      const dbUser = rows[0];
      let updatedName = name && typeof name === 'string' ? name.trim() : dbUser.name;
      let updatedEmail = dbUser.email;
      let updatedPhone = phone && typeof phone === 'string' ? phone.trim() : dbUser.phone;
      let updatedHash = dbUser.password_hash;

      if (targetNewEmail && targetNewEmail !== dbUser.email?.toLowerCase()) {
        if (callerId === targetId) {
          if (!currentPassword) {
            throw new ApiError(400, 'Current password is required to change your email address');
          }
          if (dbUser.password_hash) {
            const isMatch = await bcrypt.compare(currentPassword, dbUser.password_hash);
            if (!isMatch) {
              throw new ApiError(400, 'Current password is incorrect');
            }
          }
        }
        updatedEmail = targetNewEmail;
      }

      if (newPassword) {
        if (typeof newPassword !== 'string' || newPassword.length < 6) {
          throw new ApiError(400, 'New password must be at least 6 characters long');
        }
        if (callerId === targetId) {
          if (!currentPassword) {
            throw new ApiError(400, 'Current password is required to change password');
          }
          if (dbUser.password_hash) {
            const isMatch = await bcrypt.compare(currentPassword, dbUser.password_hash);
            if (!isMatch) {
              throw new ApiError(400, 'Current password is incorrect');
            }
          }
        }
        updatedHash = await bcrypt.hash(newPassword, 12);
      }

      const updatedAddress = address !== undefined ? (typeof address === 'string' ? address.trim() : '') : (dbUser.address || '');
      const updatedCity = city !== undefined ? (typeof city === 'string' ? city.trim() : '') : (dbUser.city || 'Lahore');

      const updatedRows = await dbQuery(
        `UPDATE users SET name = $1, email = $2, phone = $3, password_hash = $4, address = $5, city = $6, updated_at = NOW() WHERE id::text = $7 RETURNING id, name, email, role, phone, address, city, is_verified, is_active, updated_at`,
        [updatedName, updatedEmail, updatedPhone, updatedHash, updatedAddress, updatedCity, targetId]
      );
      if (updatedRows && updatedRows.length > 0) {
        const fullUser = {
          ...updatedRows[0],
          address: updatedAddress,
          city: updatedCity,
          ...(resolvedLatNum !== undefined && resolvedLngNum !== undefined ? { locationLat: resolvedLatNum, locationLng: resolvedLngNum } : {}),
        };
        syncSharedEntities(fullUser);
        emitUserUpdated(fullUser);
        if (updatedRows[0].role === 'Admin') {
          emitCompanyUpdated({ 
            companyName: updatedRows[0].name, 
            phone: updatedRows[0].phone,
            companyIcon: (updatedRows[0] as any).avatar,
            operationalInfo: `${updatedRows[0].name} Facility Operations`,
          });
        }
        const refreshedToken = await generateToken(updatedRows[0].id, updatedRows[0].role);
        return res.json(ApiResponse.success({ ...fullUser, token: refreshedToken }, 'Profile updated successfully'));
      }
    }
  } catch (e: any) {
    if (e instanceof ApiError) throw e;
  }

  throw new ApiError(404, 'User not found');
};

export const deactivate = async (req: AuthRequest, res: Response) => {
  const targetId = req.params.id as string;

  const demoMatch = DEMO_USERS.find(d => d._id === targetId);
  if (demoMatch) {
    (demoMatch as any).isActive = false;
    return res.json(ApiResponse.success(demoMatch, 'User deactivated successfully'));
  }

  const memUser = IN_MEMORY_USERS.find(u => u._id === targetId || (u as any).id === targetId);
  if (memUser) {
    memUser.isActive = false;
    const { passwordHash, ...sanitized } = memUser;
    return res.json(ApiResponse.success(sanitized, 'User deactivated successfully'));
  }

  try {
    const rows = await dbQuery(
      `UPDATE users SET is_active = false, updated_at = NOW() WHERE id::text = $1 RETURNING id, name, email, role, is_active`,
      [targetId]
    );
    if (rows && rows.length > 0) {
      return res.json(ApiResponse.success(rows[0], 'User deactivated successfully'));
    }
  } catch (_) {}

  throw new ApiError(404, 'User not found');
};

/**
 * Admin: Get all users with search, role, status filtering and pagination
 */
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  const { search = '', role, status, page = 1, limit = 50 } = req.query as any;

  let allUsers: any[] = [];

  // 1. Fetch from Postgres DB
  try {
    const rows = await dbQuery(`SELECT * FROM users ORDER BY created_at DESC`);
    if (rows && rows.length > 0) {
      for (const r of rows) {
        const isSuspended = (r.is_active === false || r.status === 'Suspended') && r.suspended_until && new Date() < new Date(r.suspended_until);
        const isExpired = r.suspended_until && new Date() >= new Date(r.suspended_until);
        const effectiveActive = isSuspended ? false : (isExpired ? true : (r.is_active ?? true));
        allUsers.push({
          _id: r.id,
          id: r.id,
          name: r.name,
          email: r.email,
          role: r.role,
          phone: r.phone || '',
          cnic: r.cnic || '',
          address: r.address || '',
          city: r.city || '',
          isVerified: r.is_verified ?? false,
          isActive: effectiveActive,
          status: isSuspended ? 'Suspended' : (effectiveActive ? 'Active' : 'Inactive'),
          suspendedAt: isSuspended ? r.suspended_at : undefined,
          suspendedUntil: isSuspended ? r.suspended_until : undefined,
          suspensionReason: isSuspended ? r.suspension_reason : undefined,
          verificationStatus: r.verification_status || (r.cnic ? 'Verified' : 'Newly Registered'),
          serviceCategories: r.service_categories || [],
          experienceYears: r.experience_years || '',
          createdAt: r.created_at || new Date(),
        });
      }
    }
  } catch (_) {}

  // 2. Blend with in-memory users
  for (const u of IN_MEMORY_USERS) {
    if (!allUsers.some(existing => existing.email.toLowerCase() === u.email.toLowerCase() || existing._id === u._id)) {
      const { passwordHash, ...sanitized } = u;
      allUsers.push({ ...sanitized, id: u._id });
    }
  }

  // 3. Blend with demo users
  for (const d of DEMO_USERS) {
    if (!allUsers.some(existing => existing.email.toLowerCase() === d.email.toLowerCase() || existing._id === d._id)) {
      const isSuspended = ((d as any).isActive === false || (d as any).status === 'Suspended') && (d as any).suspendedUntil && new Date() < new Date((d as any).suspendedUntil);
      const isExpired = (d as any).suspendedUntil && new Date() >= new Date((d as any).suspendedUntil);
      const effectiveActive = isSuspended ? false : (isExpired ? true : ((d as any).isActive !== false));
      allUsers.push({
        _id: d._id,
        id: d._id,
        name: d.name,
        email: d.email,
        role: d.role,
        phone: d.phone,
        cnic: (d as any).cnic || '',
        address: (d as any).address || 'Central Complex',
        city: (d as any).city || 'Lahore',
        isVerified: true,
        isActive: effectiveActive,
        status: isSuspended ? 'Suspended' : (effectiveActive ? 'Active' : 'Inactive'),
        suspendedAt: isSuspended ? (d as any).suspendedAt : undefined,
        suspendedUntil: isSuspended ? (d as any).suspendedUntil : undefined,
        suspensionReason: isSuspended ? (d as any).suspensionReason : undefined,
        verificationStatus: 'Verified',
        serviceCategories: (d as any).serviceCategories || [],
        experienceYears: (d as any).experienceYears || '4',
        createdAt: new Date('2026-01-15'),
      });
    }
  }

  // Filter by search query
  if (search) {
    const q = String(search).toLowerCase().trim();
    allUsers = allUsers.filter(u => 
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q)) ||
      (u.cnic && u.cnic.includes(q))
    );
  }

  // Filter out deleted users
  allUsers = allUsers.filter(u => !isUserDeleted(u));

  // Apply real-time user overrides (profile edits: name, phone, address, avatar, etc.)
  allUsers = allUsers.map(u => {
    const override = USER_OVERRIDES.get(String(u._id || u.id).toLowerCase()) ||
                     USER_OVERRIDES.get(String(u.email || '').toLowerCase());
    if (override) {
      return {
        ...u,
        ...(override.name ? { name: override.name } : {}),
        ...(override.phone !== undefined ? { phone: override.phone } : {}),
        ...(override.address !== undefined ? { address: override.address } : {}),
        ...(override.city !== undefined ? { city: override.city } : {}),
        ...(override.avatar ? { avatar: override.avatar, avatarUrl: override.avatar } : {}),
      };
    }
    return u;
  });

  // Admin 2 and Admin 3 must NOT see Admin 1 or any other administrator accounts in user listings!
  if (!checkIsCallerDefaultAdmin(req)) {
    allUsers = allUsers.filter(u => u.role !== 'Admin');
  }

  // Filter by role
  if (role && role !== 'All') {
    const rLower = String(role).toLowerCase();
    allUsers = allUsers.filter(u => (u.role || '').toLowerCase() === rLower);
  }

  // Filter by status
  if (status && status !== 'All') {
    const sLower = String(status).toLowerCase();
    if (sLower === 'active') {
      allUsers = allUsers.filter(u => u.isActive !== false);
    } else if (sLower === 'suspended' || sLower === 'inactive') {
      allUsers = allUsers.filter(u => u.isActive === false);
    }
  }

  const total = allUsers.length;
  const p = Math.max(1, Number(page));
  const l = Math.max(1, Number(limit));
  const paginated = allUsers.slice((p - 1) * l, p * l);

  res.json(ApiResponse.paginated(paginated, p, l, total, 'Users retrieved successfully'));
};

/**
 * Admin: Create any user account (Client, FieldTeam/Worker, Admin)
 */
export const createUser = async (req: AuthRequest, res: Response) => {
  const { 
    name, email, password, role = 'Client', 
    phone = '', cnic = '', address = '', city = 'Lahore',
    serviceCategories = [], experienceYears = ''
  } = req.body;

  if (role === 'Admin' && !checkIsCallerDefaultAdmin(req)) {
    throw new ApiError(403, 'Permission denied. Only the Primary Administrator can create administrator accounts.');
  }

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email, and password are required');
  }

  const cleanEmail = email.toLowerCase().trim();

  // Check email conflict across registered admins, demo users, and in-memory users
  if (DEMO_USERS.some(d => d.email.toLowerCase() === cleanEmail) ||
      IN_MEMORY_USERS.some(u => u.email.toLowerCase() === cleanEmail) ||
      Boolean(findAdminByEmailOrId(cleanEmail))) {
    throw new ApiError(409, 'A user with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const newUserId = '65f000000000000000000' + Math.floor(Math.random() * 899 + 100);

  // Generate 4-digit verification code for new user
  const verificationCode = crypto.randomInt(1000, 10000).toString();
  const verificationCodeExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const newUserObj: any = {
    _id: newUserId,
    id: newUserId,
    name: name.trim(),
    email: cleanEmail,
    passwordHash,
    role,
    phone: phone.trim(),
    cnic: cnic.trim(),
    address: address.trim(),
    city: city.trim(),
    serviceCategories: Array.isArray(serviceCategories) ? serviceCategories : [],
    experienceYears: experienceYears ? String(experienceYears) : '',
    isVerified: false,
    verificationCode,
    verificationCodeExpiry,
    isActive: true,
    verificationStatus: 'Pending Verification',
    createdAt: new Date(),
    updatedAt: new Date(),
    failedLoginAttempts: 0,
  };

  IN_MEMORY_USERS.push(newUserObj);
  savePersistedUsers();

  if (role === 'Admin') {
    const allAdmins = getRegisteredAdmins();
    const newAdminEntry: any = {
      _id: newUserId,
      id: `A#000${allAdmins.length + 1}`,
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: 'Admin',
      isPrimary: false,
      phone: phone.trim(),
      cnic: cnic.trim(),
      cnicVerified: false,
      verificationStatus: 'Pending Verification',
      address: address.trim(),
      city: city.trim(),
      serviceCategories: ['Supervisory Operations'],
      specialization: 'System Administration & Operations',
      experienceYears: '5',
      status: 'Active',
      isActive: true,
      isVerified: false,
      verificationCode,
      verificationCodeExpiry,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    allAdmins.push(newAdminEntry);
    writeRegisteredAdmins(allAdmins);
  }

  // Insert into PostgreSQL
  try {
    const rows = await dbQuery(
      `INSERT INTO users (name, email, password_hash, role, phone, cnic, address, city, service_categories, experience_years, is_verified, is_active, verification_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, true, $11)
       RETURNING *`,
      [
        name.trim(),
        cleanEmail,
        passwordHash,
        role,
        phone.trim(),
        cnic.trim(),
        address.trim(),
        city.trim(),
        Array.isArray(serviceCategories) ? serviceCategories : [],
        experienceYears ? String(experienceYears) : '',
        'Pending Verification',
      ]
    );
    if (rows && rows.length > 0) {
      newUserObj._id = rows[0].id;
      newUserObj.id = rows[0].id;
    }
  } catch (err: any) {
    if (err.code === '23505') {
      throw new ApiError(409, 'A user with this email already exists in the database');
    }
  }

  // Dispatch verification email with 4-digit code
  const originBaseUrl = (req.headers.origin as string) || (req.headers.referer ? new URL(req.headers.referer as string).origin : '') || '';
  try {
    await sendVerificationEmail(cleanEmail, name.trim(), verificationCode, undefined, originBaseUrl, role);
  } catch (e) {
    console.error('Failed to send verification email for created user:', e);
  }

  const { passwordHash: _, ...sanitized } = newUserObj;
  res.status(201).json(ApiResponse.created(sanitized, `User account created! A 4-digit verification code has been dispatched to ${cleanEmail}.`));
};

/**
 * Admin: Update any user record
 */
export const adminUpdateUser = async (req: AuthRequest, res: Response) => {
  const targetId = String(req.params.id);
  const { 
    name, email, role, phone, cnic, address, city, locationLat, locationLng,
    verificationStatus, isActive, serviceCategories, experienceYears 
  } = req.body;

  const isCallerDefaultAdmin = checkIsCallerDefaultAdmin(req);
  const targetUser = DEMO_USERS.find(d => matchesTargetUser(d, targetId)) ||
                     IN_MEMORY_USERS.find(u => matchesTargetUser(u, targetId));

  if (targetUser?.role === 'Admin') {
    if (!isCallerDefaultAdmin) {
      throw new ApiError(403, 'Permission denied. Only the Default Super Administrator can modify administrator accounts.');
    }
  }

  let updatedUser: any = null;

  // 0. Update Registered Admin
  const adminMatch = findAdminByEmailOrId(targetId);
  if (adminMatch) {
    if (adminMatch.role === 'Admin' && !isCallerDefaultAdmin) {
      throw new ApiError(403, 'Permission denied. Only the Default Super Administrator can modify administrator accounts.');
    }
    if (name) adminMatch.name = name.trim();
    if (email) adminMatch.email = email.toLowerCase().trim();
    if (phone !== undefined) adminMatch.phone = phone.trim();
    if (cnic !== undefined) adminMatch.cnic = cnic.trim();
    if (address !== undefined) adminMatch.address = address.trim();
    if (city !== undefined) adminMatch.city = city.trim();
    if (verificationStatus !== undefined) adminMatch.verificationStatus = verificationStatus;
    if (isActive !== undefined) {
      adminMatch.isActive = Boolean(isActive);
      adminMatch.status = Boolean(isActive) ? 'Active' : 'Suspended';
    }
    if (serviceCategories !== undefined) adminMatch.serviceCategories = serviceCategories;
    if (experienceYears !== undefined) adminMatch.experienceYears = String(experienceYears);
    adminMatch.updatedAt = new Date().toISOString();

    const allAdmins = getRegisteredAdmins();
    const idx = allAdmins.findIndex(a => a._id === adminMatch._id || a.email.toLowerCase() === adminMatch.email.toLowerCase());
    if (idx >= 0) allAdmins[idx] = adminMatch;
    else allAdmins.push(adminMatch);
    writeRegisteredAdmins(allAdmins);

    const { passwordHash, ...sanitized } = adminMatch;
    updatedUser = { ...sanitized, id: adminMatch.id || adminMatch._id };
  }

  // 1. Update in-memory
  const memUser = IN_MEMORY_USERS.find(u => matchesTargetUser(u, targetId));
  if (memUser) {
    if (name) memUser.name = name.trim();
    if (email) memUser.email = email.toLowerCase().trim();
    if (role) memUser.role = role;
    if (phone !== undefined) memUser.phone = phone.trim();
    if (cnic !== undefined) memUser.cnic = cnic.trim();
    if (address !== undefined) memUser.address = address.trim();
    if (city !== undefined) memUser.city = city.trim();
    if (verificationStatus !== undefined) memUser.verificationStatus = verificationStatus;
    if (isActive !== undefined) memUser.isActive = Boolean(isActive);
    if (serviceCategories !== undefined) memUser.serviceCategories = serviceCategories;
    if (experienceYears !== undefined) memUser.experienceYears = String(experienceYears);
    (memUser as any).updatedAt = new Date();
    savePersistedUsers();
    const { passwordHash, ...sanitized } = memUser;
    updatedUser = { ...sanitized, id: memUser._id };
  }

  // 2. Update demo users if targeted
  const demoMatch = DEMO_USERS.find(d => matchesTargetUser(d, targetId));
  if (demoMatch) {
    if (name) demoMatch.name = name.trim();
    if (email) (demoMatch as any).email = email.toLowerCase().trim();
    if (phone !== undefined) demoMatch.phone = phone.trim();
    if (role) (demoMatch as any).role = role;
    if (address !== undefined) (demoMatch as any).address = address.trim();
    if (city !== undefined) (demoMatch as any).city = city.trim();
    if (isActive !== undefined) (demoMatch as any).isActive = Boolean(isActive);
    if (cnic !== undefined) (demoMatch as any).cnic = cnic.trim();
    updatedUser = { ...demoMatch, id: demoMatch._id, isVerified: true };
  }

  // 3. Update PostgreSQL DB
  try {
    const rows = await dbQuery(
      `UPDATE users
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           role = COALESCE($3, role),
           phone = COALESCE($4, phone),
           cnic = COALESCE($5, cnic),
           address = COALESCE($6, address),
           city = COALESCE($7, city),
           verification_status = COALESCE($8, verification_status),
           is_active = COALESCE($9, is_active),
           service_categories = COALESCE($10, service_categories),
           experience_years = COALESCE($11, experience_years),
           updated_at = NOW()
       WHERE id::text = $12
       RETURNING *`,
      [
        name ? name.trim() : null,
        email ? email.toLowerCase().trim() : null,
        role || null,
        phone !== undefined ? phone.trim() : null,
        cnic !== undefined ? cnic.trim() : null,
        address !== undefined ? address.trim() : null,
        city !== undefined ? city.trim() : null,
        verificationStatus || null,
        isActive !== undefined ? Boolean(isActive) : null,
        serviceCategories || null,
        experienceYears !== undefined ? String(experienceYears) : null,
        targetId
      ]
    );
    if (rows && rows.length > 0) {
      const r = rows[0];
      updatedUser = {
        _id: r.id,
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        phone: r.phone,
        cnic: r.cnic,
        address: r.address,
        city: r.city,
        verificationStatus: r.verification_status,
        isActive: r.is_active,
        serviceCategories: r.service_categories,
        experienceYears: r.experience_years,
        updatedAt: r.updated_at,
      };
    }
  } catch (_) {}

  if (!updatedUser) {
    throw new ApiError(404, 'User not found');
  }

  // Persist user override to disk
  try {
    const overrideKey = String(targetUser?._id || targetId).toLowerCase().trim();
    const existing = USER_OVERRIDES.get(overrideKey) || {};
    const updatedOverride = {
      ...existing,
      ...(name ? { name: name.trim() } : {}),
      ...(email ? { email: email.toLowerCase().trim() } : {}),
      ...(phone !== undefined ? { phone: phone.trim() } : {}),
      ...(address !== undefined ? { address: address.trim() } : {}),
      ...(city !== undefined ? { city: city.trim() } : {}),
      ...(cnic !== undefined ? { cnic: cnic.trim() } : {}),
      ...(isActive !== undefined ? { isActive: Boolean(isActive), status: Boolean(isActive) ? 'Active' : 'Inactive' } : {}),
      ...(role ? { role } : {}),
    };
    USER_OVERRIDES.set(overrideKey, updatedOverride);
    if (targetUser?.email) {
      USER_OVERRIDES.set(targetUser.email.toLowerCase().trim(), updatedOverride);
    }
    if ((targetUser as any)?.id) {
      USER_OVERRIDES.set(String((targetUser as any).id).toLowerCase().trim(), updatedOverride);
    }
    persistUserOverrides();
  } catch (_) {}

  emitUserUpdated(updatedUser);

  res.json(ApiResponse.success(updatedUser, 'User updated successfully by Administrator'));
};

/**
 * Admin: Delete user account
 */
export const deleteUser = async (req: AuthRequest, res: Response) => {
  const targetId = String(req.params.id);
  const callerId = req.user?.userId;
  const isCallerDefaultAdmin = checkIsCallerDefaultAdmin(req);

  if (targetId === callerId || (req.user && matchesTargetUser(req.user, targetId))) {
    throw new ApiError(400, 'Administrators cannot delete their own active account');
  }

  const targetUser = DEMO_USERS.find(d => matchesTargetUser(d, targetId)) ||
                     IN_MEMORY_USERS.find(u => matchesTargetUser(u, targetId));

  if (targetUser && (isDefaultAdminUser(targetUser._id) || isDefaultAdminUser((targetUser as any).id) || isDefaultAdminUser(targetUser.email))) {
    throw new ApiError(400, 'The Default Super Administrator account cannot be deleted');
  }

  if (targetUser?.role === 'Admin') {
    if (!isCallerDefaultAdmin) {
      throw new ApiError(403, 'Permission denied. Only the Primary Administrator can delete administrator accounts.');
    }
    const adminPassword = (req.body?.adminPassword || req.headers['x-admin-password'] || (req.query as any)?.adminPassword || '').trim();
    const primaryAdmin = DEMO_USERS.find(d => isDefaultAdminUser(d._id) || isDefaultAdminUser(d.email));
    const expectedPass = (primaryAdmin?.password || 'Admin@123').trim();

    if (!adminPassword || adminPassword !== expectedPass) {
      throw new ApiError(403, 'Invalid Primary Administrator password. Administrator deletion denied.');
    }
  }

  let deletedEmail: string | undefined;
  let deletedName: string | undefined;

  // 1. Remove from in-memory
  const memIdx = IN_MEMORY_USERS.findIndex(u => matchesTargetUser(u, targetId));
  if (memIdx !== -1) {
    deletedEmail = IN_MEMORY_USERS[memIdx].email;
    deletedName = IN_MEMORY_USERS[memIdx].name;
    IN_MEMORY_USERS.splice(memIdx, 1);
  }

  // 2. Remove from demo users if targeted
  const demoIdx = DEMO_USERS.findIndex(d => matchesTargetUser(d, targetId));
  if (demoIdx !== -1) {
    if (!deletedEmail) deletedEmail = DEMO_USERS[demoIdx].email;
    if (!deletedName) deletedName = DEMO_USERS[demoIdx].name;
    DEMO_USERS.splice(demoIdx, 1);
  }

  // Track in deleted set so directory & registrations never resurface them
  const rawTarget = targetId.toLowerCase().trim();
  DELETED_USER_IDS.add(rawTarget);
  const stripped = targetId.replace(/^[ACW]#/i, '').toLowerCase().trim();
  if (stripped) DELETED_USER_IDS.add(stripped);
  if (deletedEmail) DELETED_USER_IDS.add(deletedEmail.toLowerCase().trim());
  if (deletedName) DELETED_USER_IDS.add(deletedName.toLowerCase().trim());
  if (targetUser?._id) DELETED_USER_IDS.add(String(targetUser._id).toLowerCase().trim());
  if ((targetUser as any)?.id) DELETED_USER_IDS.add(String((targetUser as any).id).toLowerCase().trim());
  if ((targetUser as any)?.aliases && Array.isArray((targetUser as any).aliases)) {
    (targetUser as any).aliases.forEach((a: string) => DELETED_USER_IDS.add(String(a).toLowerCase().trim()));
  }
  persistDeletedUsers();

  // 3. Remove from PostgreSQL DB
  try {
    await dbQuery(`DELETE FROM users WHERE id::text = $1 OR email = $1 OR id::text LIKE $2`, [targetId, `%${stripped}`]);
  } catch (_) {}

  // 4. PERMANENTLY PURGE ALL LOCATION TRACKING DATA FOR THIS USER
  try {
    await removeTrackingForUser(targetId, deletedName, deletedEmail, stripped);
    const io = getIo();
    if (io) {
      io.emit('gps:remove', { userId: targetId, strippedId: stripped, name: deletedName });
      io.emit('tracking:removed', { userId: targetId, strippedId: stripped, name: deletedName });
      io.emit('user:deleted', { userId: targetId, email: deletedEmail, role: targetUser?.role || 'User' });
    }
  } catch (_) {}

  res.json(ApiResponse.success({ id: targetId }, 'User and location tracking deleted permanently by Administrator'));
};

/**
 * Admin: Reset user password directly
 */
export const adminResetPassword = async (req: AuthRequest, res: Response) => {
  const targetId = String(req.params.id);
  const { newPassword } = req.body;
  const isCallerDefaultAdmin = checkIsCallerDefaultAdmin(req);

  const adminTarget = findAdminByEmailOrId(targetId);
  const targetUser = adminTarget ||
                     DEMO_USERS.find(d => matchesTargetUser(d, targetId)) ||
                     IN_MEMORY_USERS.find(u => matchesTargetUser(u, targetId));
  if (targetUser?.role === 'Admin') {
    if (!isCallerDefaultAdmin) {
      throw new ApiError(403, 'Permission denied. Only the Default Super Administrator can reset administrator passwords.');
    }
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters long');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  // 0. Registered Admin
  if (adminTarget) {
    adminTarget.passwordHash = passwordHash;
    adminTarget.updatedAt = new Date().toISOString();
    const allAdmins = getRegisteredAdmins();
    const idx = allAdmins.findIndex(a => a._id === adminTarget._id || a.email.toLowerCase() === adminTarget.email.toLowerCase());
    if (idx >= 0) allAdmins[idx] = adminTarget;
    writeRegisteredAdmins(allAdmins);
    return res.json(ApiResponse.success(null, 'User password reset successfully by Administrator'));
  }

  // 1. In-memory
  const memUser = IN_MEMORY_USERS.find(u => matchesTargetUser(u, targetId));
  if (memUser) {
    memUser.passwordHash = passwordHash;
    savePersistedUsers();
  }

  // 2. Demo users
  const demoUser = DEMO_USERS.find(d => matchesTargetUser(d, targetId));
  if (demoUser) {
    demoUser.password = newPassword;
  }

  // 3. PostgreSQL DB
  try {
    await dbQuery(`UPDATE users SET password_hash = $1 WHERE id::text = $2`, [passwordHash, targetId]);
  } catch (_) {}

  res.json(ApiResponse.success(null, 'User password reset successfully by Administrator'));
};

/**
 * Admin: Toggle user active status (Activate / Suspend for 1 Week / Revoke Suspension)
 */
export const toggleUserStatus = async (req: AuthRequest, res: Response) => {
  const targetId = String(req.params.id);
  const { isActive, durationDays, revokeSuspension, reason } = req.body;
  const isCallerDefaultAdmin = checkIsCallerDefaultAdmin(req);

  const adminTarget = findAdminByEmailOrId(targetId);
  const targetUser = adminTarget ||
                     DEMO_USERS.find(d => matchesTargetUser(d, targetId)) ||
                     IN_MEMORY_USERS.find(u => matchesTargetUser(u, targetId));

  if (targetUser && (isDefaultAdminUser(targetUser._id) || isDefaultAdminUser((targetUser as any).id) || isDefaultAdminUser(targetUser.email))) {
    throw new ApiError(400, 'The Default Super Administrator account cannot be suspended');
  }

  if (targetUser?.role === 'Admin') {
    if (!isCallerDefaultAdmin) {
      throw new ApiError(403, 'Permission denied. Only the Default Super Administrator can suspend administrator accounts.');
    }
  }

  // If revokeSuspension is true, or isActive is explicitly true, reactivate immediately.
  const shouldBeActive = revokeSuspension ? true : (isActive !== undefined ? Boolean(isActive) : false);

  const now = new Date();
  // 1 week limitation (7 days) for account suspension
  const days = Number(durationDays) || 7;
  const suspendedAt = shouldBeActive ? null : now.toISOString();
  const suspendedUntil = shouldBeActive ? null : new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  const suspensionReason = shouldBeActive ? null : (reason || `Suspended by Administrator for ${days} days`);
  const statusStr = shouldBeActive ? 'Active' : 'Suspended';

  // 0. Registered Admin
  if (adminTarget) {
    if (adminTarget.isPrimary || isDefaultAdminUser(adminTarget._id) || isDefaultAdminUser(adminTarget.email)) {
      throw new ApiError(400, 'The Primary Administrator account cannot be suspended');
    }
    adminTarget.isActive = shouldBeActive;
    adminTarget.status = statusStr;
    adminTarget.updatedAt = new Date().toISOString();
    const allAdmins = getRegisteredAdmins();
    const idx = allAdmins.findIndex(a => a._id === adminTarget._id || a.email.toLowerCase() === adminTarget.email.toLowerCase());
    if (idx >= 0) allAdmins[idx] = adminTarget;
    writeRegisteredAdmins(allAdmins);
  }

  // 1. In-memory
  const memUser = IN_MEMORY_USERS.find(u => matchesTargetUser(u, targetId));
  if (memUser) {
    memUser.isActive = shouldBeActive;
    (memUser as any).status = statusStr;
    (memUser as any).suspendedAt = suspendedAt;
    (memUser as any).suspendedUntil = suspendedUntil;
    (memUser as any).suspensionReason = suspensionReason;
    savePersistedUsers();
  }

  // 2. Demo users
  const demoUser = DEMO_USERS.find(d => matchesTargetUser(d, targetId));
  if (demoUser) {
    (demoUser as any).isActive = shouldBeActive;
    (demoUser as any).status = statusStr;
    (demoUser as any).suspendedAt = suspendedAt;
    (demoUser as any).suspendedUntil = suspendedUntil;
    (demoUser as any).suspensionReason = suspensionReason;
  }

  // 3. PostgreSQL DB
  try {
    await dbQuery(`
      UPDATE users 
      SET is_active = $1, 
          suspended_at = $2, 
          suspended_until = $3, 
          suspension_reason = $4,
          updated_at = NOW() 
      WHERE id::text = $5 OR email = $5
    `, [shouldBeActive, suspendedAt, suspendedUntil, suspensionReason, targetId]);
  } catch (_) {}

  // Persist status change to disk
  try {
    const overrideKey = String(targetUser?._id || targetId).toLowerCase().trim();
    const existing = USER_OVERRIDES.get(overrideKey) || {};
    const updatedOverride = {
      ...existing,
      isActive: shouldBeActive,
      status: statusStr,
      suspendedAt,
      suspendedUntil,
      suspensionReason
    };
    USER_OVERRIDES.set(overrideKey, updatedOverride);
    if (targetUser?.email) {
      USER_OVERRIDES.set(targetUser.email.toLowerCase().trim(), updatedOverride);
    }
    if ((targetUser as any)?.id) {
      USER_OVERRIDES.set(String((targetUser as any).id).toLowerCase().trim(), updatedOverride);
    }
    persistUserOverrides();
  } catch (_) {}

  res.json(ApiResponse.success({ 
    id: targetId, 
    isActive: shouldBeActive,
    status: statusStr,
    suspendedAt,
    suspendedUntil,
    suspensionReason,
    daysSuspended: shouldBeActive ? 0 : days,
  }, shouldBeActive 
      ? 'User suspension revoked successfully. Account is now Active.' 
      : `User suspended for 1 week (until ${new Date(suspendedUntil!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`
  ));
};

/**
 * Operations directory: returns categorized list of clients and workers
 */
export const getOperationsDirectory = async (req: AuthRequest, res: Response) => {
  let clients: any[] = [];
  let workers: any[] = [];
  let admins: any[] = [];

  const isCallerDefaultAdmin = checkIsCallerDefaultAdmin(req);

  // 1. PostgreSQL DB
  try {
    const rows = await dbQuery(`SELECT * FROM users WHERE role IN ('Client', 'FieldTeam', 'Worker') ORDER BY name ASC`);
    if (rows && rows.length > 0) {
      for (const r of rows) {
        if (isUserDeleted(r)) continue;
        const isClient = r.role === 'Client';
        const isSuspended = (r.is_active === false || r.status === 'Suspended') && r.suspended_until && new Date() < new Date(r.suspended_until);
        const isExpired = r.suspended_until && new Date() >= new Date(r.suspended_until);
        const effectiveActive = isSuspended ? false : (isExpired ? true : (r.is_active ?? true));
        const effectiveStatus = isSuspended ? 'Suspended' : (effectiveActive ? 'Active' : 'Inactive');

        const override = USER_OVERRIDES.get(String(r.id).toLowerCase()) ||
                         USER_OVERRIDES.get(String(r.email || '').toLowerCase());

        const cnicVal = (override?.cnic || r.cnic || '').trim();
        const hasValidCnic = cnicVal.replace(/\D/g, '').length === 13;
        const isCnicDone = hasValidCnic && Boolean(
          override?.cnicVerified === true ||
          r.cnic_verified === true ||
          override?.verificationStatus === 'Verified' ||
          r.verification_status === 'Verified'
        );

        // Require CNIC verification before appearing in operations
        if (!isCnicDone) {
          continue;
        }

        let workerWallet: any = null;
        if (!isClient) {
          try {
            workerWallet = await getOrCreateWallet(String(r.id));
          } catch (_) {}
        }
        const workerPoints = !isClient ? Number(workerWallet?.pointsBalance ?? 0) : 0;
        const workerEarnings = !isClient && workerWallet?.totalEarnings !== undefined ? ('PKR ' + Number(workerWallet.totalEarnings).toLocaleString()) : 'PKR 0';

        const formatted = {
          _id: r.id,
          id: resolveOperationsDisplayId({ id: r.id, _id: r.id, name: override?.name || r.name, email: override?.email || r.email }, isClient),
          name: override?.name || r.name,
          gender: ((override?.name || r.name) || '').toLowerCase().includes('ayesha') || ((override?.name || r.name) || '').toLowerCase().includes('fatima') ? 'girl' : 'boy',
          email: override?.email || r.email,
          phone: override?.phone || r.phone || '+92 300 1234567',
          role: override?.role || r.role,
          cnic: override?.cnic || r.cnic || '',
          address: override?.address || r.address || 'Central Complex',
          city: override?.city || r.city || 'Lahore',
          isVerified: r.is_verified ?? true,
          isActive: effectiveActive,
          status: effectiveStatus,
          suspendedAt: isSuspended ? r.suspended_at : undefined,
          suspendedUntil: isSuspended ? r.suspended_until : undefined,
          suspensionReason: isSuspended ? r.suspension_reason : undefined,
          verificationStatus: r.verification_status || (r.cnic ? 'Verified' : 'Newly Registered'),
          serviceCategories: r.service_categories || ['Cleaning'],
          experienceYears: r.experience_years || '3',
          totalSpent: isClient ? 'PKR 0' : 'PKR 0',
          activeOrders: 0,
          totalOrders: 0,
          totalRequests: 0,
          acceptedRequests: 0,
          cancelledOrRefused: 0,
          inProgress: 0,
          rating: Number(r.rating ?? r.average_rating ?? 0.0),
          averageRating: Number(r.average_rating ?? r.rating ?? 0.0),
          completedJobs: 0,
          totalEarnings: workerEarnings,
          purchasedPoints: workerPoints,
          bankDepositPkr: `PKR ${(workerPoints * 100).toLocaleString()}`,
          registeredDate: r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Jan 15, 2026',
        };
        if (isClient) clients.push(formatted);
        else workers.push(formatted);
      }
    }
  } catch (_) {}

  // 2. In-memory
  for (const u of IN_MEMORY_USERS) {
    if (isUserDeleted(u)) continue;
    if (!clients.some(c => c.email.toLowerCase() === u.email.toLowerCase() || c._id === u._id) &&
        !workers.some(w => w.email.toLowerCase() === u.email.toLowerCase() || w._id === u._id)) {
      const isClient = u.role === 'Client';
      const isSuspended = (u.isActive === false || (u as any).status === 'Suspended') && (u as any).suspendedUntil && new Date() < new Date((u as any).suspendedUntil);
      const isExpired = (u as any).suspendedUntil && new Date() >= new Date((u as any).suspendedUntil);
      const effectiveActive = isSuspended ? false : (isExpired ? true : (u.isActive !== false));
      const effectiveStatus = isSuspended ? 'Suspended' : (effectiveActive ? 'Active' : 'Inactive');

      const override = USER_OVERRIDES.get(String(u._id || (u as any).id || '').toLowerCase()) ||
                       USER_OVERRIDES.get(String(u.email || '').toLowerCase());

      const cnicVal = (override?.cnic || u.cnic || '').trim();
      const hasValidCnic = cnicVal.replace(/\D/g, '').length === 13;
      const isCnicDone = hasValidCnic && Boolean(
        override?.cnicVerified === true ||
        u.cnicVerified === true ||
        override?.verificationStatus === 'Verified' ||
        u.verificationStatus === 'Verified'
      );

      // Require CNIC verification before appearing in operations
      if (!isCnicDone) {
        continue;
      }

      let workerWallet: any = null;
      if (!isClient) {
        try {
          const wId = String(u._id || (u as any).id);
          workerWallet = await getOrCreateWallet(wId);
        } catch (_) {}
      }
      const workerPoints = !isClient ? Number(workerWallet?.pointsBalance ?? 0) : 0;
      const workerEarnings = !isClient && workerWallet?.totalEarnings !== undefined ? ('PKR ' + Number(workerWallet.totalEarnings).toLocaleString()) : 'PKR 0';

      const formatted = {
        _id: u._id,
        id: resolveOperationsDisplayId({ id: u._id, _id: u._id, name: override?.name || u.name, email: override?.email || u.email }, isClient),
        name: override?.name || u.name,
        gender: ((override?.name || u.name) || '').toLowerCase().includes('ayesha') || ((override?.name || u.name) || '').toLowerCase().includes('fatima') ? 'girl' : 'boy',
        email: override?.email || u.email,
        phone: override?.phone || u.phone || '+92 300 1234567',
        role: override?.role || u.role,
        cnic: override?.cnic || u.cnic || '',
        address: override?.address || u.address || 'Central Complex',
        city: override?.city || u.city || 'Lahore',
        isVerified: u.isVerified ?? false,
        isActive: effectiveActive,
        status: effectiveStatus,
        suspendedAt: isSuspended ? (u as any).suspendedAt : undefined,
        suspendedUntil: isSuspended ? (u as any).suspendedUntil : undefined,
        suspensionReason: isSuspended ? (u as any).suspensionReason : undefined,
        verificationStatus: u.verificationStatus || 'Newly Registered',
        serviceCategories: u.serviceCategories || ['Cleaning'],
        experienceYears: u.experienceYears || '2',
        totalSpent: 'PKR 0',
        activeOrders: 0,
        totalOrders: 0,
        totalRequests: 0,
        acceptedRequests: 0,
        cancelledOrRefused: 0,
        inProgress: 0,
        rating: Number((u as any).rating ?? (u as any).averageRating ?? 0.0),
        averageRating: Number((u as any).averageRating ?? (u as any).rating ?? 0.0),
        completedJobs: 0,
        totalEarnings: workerEarnings,
        purchasedPoints: workerPoints,
        bankDepositPkr: `PKR ${(workerPoints * 100).toLocaleString()}`,
        registeredDate: u.registeredAt ? new Date(u.registeredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today',
      };
      if (isClient) clients.push(formatted);
      else workers.push(formatted);
    }
  }

  // 3. Demo users
  for (const d of DEMO_USERS) {
    if ((d.role as string) === 'Admin') continue;
    if (isUserDeleted(d)) continue;
    const isClient = d.role === 'Client';
    if (!clients.some(c => c.email.toLowerCase() === d.email.toLowerCase()) &&
        !workers.some(w => w.email.toLowerCase() === d.email.toLowerCase())) {
      const isSuspended = ((d as any).isActive === false || (d as any).status === 'Suspended') && (d as any).suspendedUntil && new Date() < new Date((d as any).suspendedUntil);
      const isExpired = (d as any).suspendedUntil && new Date() >= new Date((d as any).suspendedUntil);

      const override = USER_OVERRIDES.get(String(d._id).toLowerCase()) || 
                       USER_OVERRIDES.get(String((d as any).id || '').toLowerCase()) ||
                       USER_OVERRIDES.get(String(d.email || '').toLowerCase());

      const cnicVal = (override?.cnic || (d as any).cnic || '').trim();
      const hasValidCnic = cnicVal.replace(/\D/g, '').length === 13;
      const isCnicDone = hasValidCnic && Boolean(
        override?.cnicVerified === true ||
        (d as any).cnicVerified === true ||
        override?.verificationStatus === 'Verified' ||
        (d as any).verificationStatus === 'Verified'
      );

      // Require CNIC verification before appearing in operations
      if (!isCnicDone) {
        continue;
      }

      const effectiveActive = override?.isActive !== undefined 
        ? override.isActive 
        : (isSuspended ? false : (isExpired ? true : ((d as any).isActive !== false)));
      const effectiveStatus = override?.status 
        ? override.status 
        : (isSuspended ? 'Suspended' : (effectiveActive ? 'Active' : 'Inactive'));

      let workerWallet: any = null;
      if (!isClient) {
        try {
          const wId = String(d._id || (d as any).id);
          workerWallet = await getOrCreateWallet(wId);
        } catch (_) {}
      }
      const workerPoints = !isClient ? Number(workerWallet?.pointsBalance ?? 0) : 0;
      const workerEarnings = !isClient && workerWallet?.totalEarnings !== undefined ? ('PKR ' + Number(workerWallet.totalEarnings).toLocaleString()) : ((d as any).totalEarnings || 'PKR 0');

      const formatted = {
        _id: d._id,
        id: resolveOperationsDisplayId({ id: (d as any).id || d._id, _id: d._id, name: override?.name || d.name, email: override?.email || d.email }, isClient),
        name: override?.name || d.name,
        gender: (d.name || '').toLowerCase().includes('ayesha') || (d.name || '').toLowerCase().includes('fatima') || (d.name || '').toLowerCase().includes('zoya') ? 'girl' : 'boy',
        email: override?.email || d.email,
        phone: override?.phone || d.phone,
        role: override?.role || d.role,
        cnic: override?.cnic || (d as any).cnic || '',
        address: override?.address || (d as any).address || 'Central Facility Complex',
        city: override?.city || (d as any).city || 'Lahore',
        isVerified: true,
        isActive: effectiveActive,
        status: effectiveStatus,
        suspendedAt: override?.suspendedAt !== undefined ? override.suspendedAt : (isSuspended ? (d as any).suspendedAt : undefined),
        suspendedUntil: override?.suspendedUntil !== undefined ? override.suspendedUntil : (isSuspended ? (d as any).suspendedUntil : undefined),
        suspensionReason: override?.suspensionReason !== undefined ? override.suspensionReason : (isSuspended ? (d as any).suspensionReason : undefined),
        verificationStatus: 'Verified',
        serviceCategories: (d as any).serviceCategories || ['HVAC Maintenance', 'Electrical Repair'],
        specialization: (d as any).specialization || ((d as any).serviceCategories ? (d as any).serviceCategories.join(', ') : 'Field Operations'),
        crewName: (d as any).crewName || 'Alpha Crew (Cleaning)',
        experienceYears: (d.name || '').toLowerCase().includes('hassan') || (d.email || '').toLowerCase().includes('client@clearflow') ? '0' : ((d as any).experienceYears || '4'),
        totalSpent: (d.name || '').toLowerCase().includes('hassan') || (d.email || '').toLowerCase().includes('client@clearflow') ? 'PKR 0' : (isClient ? ((d as any).totalSpent || 'PKR 285,000') : 'PKR 0'),
        activeOrders: (d.name || '').toLowerCase().includes('hassan') || (d.email || '').toLowerCase().includes('client@clearflow') ? 0 : ((d as any).activeOrders ?? 1),
        totalOrders: (d.name || '').toLowerCase().includes('hassan') || (d.email || '').toLowerCase().includes('client@clearflow') ? 0 : ((d as any).totalOrders ?? ((d as any).totalRequests ?? 6)),
        totalRequests: (d.name || '').toLowerCase().includes('hassan') || (d.email || '').toLowerCase().includes('client@clearflow') ? 0 : ((d as any).totalRequests ?? 6),
        acceptedRequests: (d.name || '').toLowerCase().includes('hassan') || (d.email || '').toLowerCase().includes('client@clearflow') ? 0 : ((d as any).acceptedRequests ?? 4),
        cancelledOrRefused: (d as any).cancelledOrRefused ?? 0,
        inProgress: (d.name || '').toLowerCase().includes('hassan') || (d.email || '').toLowerCase().includes('client@clearflow') ? 0 : ((d as any).inProgress ?? 1),
        rating: Number((d as any).rating ?? (d as any).averageRating ?? 0.0),
        averageRating: Number((d as any).averageRating ?? (d as any).rating ?? 0.0),
        completedJobs: (d.name || '').toLowerCase().includes('hassan') || (d.email || '').toLowerCase().includes('client@clearflow') ? 0 : ((d as any).acceptedRequests ?? 14),
        totalEarnings: (d.name || '').toLowerCase().includes('hassan') || (d.email || '').toLowerCase().includes('client@clearflow') ? 'PKR 0' : workerEarnings,
        purchasedPoints: (d.name || '').toLowerCase().includes('hassan') || (d.email || '').toLowerCase().includes('client@clearflow') ? 0 : workerPoints,
        bankDepositPkr: (d.name || '').toLowerCase().includes('hassan') || (d.email || '').toLowerCase().includes('client@clearflow') ? 'PKR 0' : `PKR ${(workerPoints * 100).toLocaleString()}`,
        registeredDate: (d as any).registeredDate || 'Jan 10, 2026',
      };
      if (isClient) clients.push(formatted);
      else workers.push(formatted);
    }
  }

  // 4. Include Registered Admins in Operations directory
  const registeredAdmins = getRegisteredAdmins();
  for (const d of registeredAdmins) {
    if (isUserDeleted(d)) continue;

    // Only show an admin in Operations if they have actually logged in at least once.
    // The primary admin (isPrimary) is always visible.
    // A secondary admin is only visible after their first successful login.
    if (!d.isPrimary && !d.hasLoggedIn) continue;

    const isPrimary = Boolean(d.isPrimary);
    const isSuspended = (d.isActive === false || d.status === 'Suspended');
    const override = USER_OVERRIDES.get(String(d._id).toLowerCase()) || 
                     USER_OVERRIDES.get(String(d.id || '').toLowerCase()) ||
                     USER_OVERRIDES.get(String(d.email || '').toLowerCase());

    const effectiveActive = override?.isActive !== undefined 
      ? override.isActive 
      : (isSuspended ? false : (d.isActive !== false));
    const effectiveStatus = override?.status 
      ? override.status 
      : (isSuspended ? 'Suspended' : (effectiveActive ? 'Active' : 'Inactive'));

    const adminObj = {
      _id: d._id,
      id: d.id || (isPrimary ? 'A#0001' : 'A#0002'),
      name: override?.name || d.name,
      gender: 'boy',
      email: override?.email || d.email,
      phone: override?.phone || d.phone || (isPrimary ? '+1 555 0192834' : '+1 555 0192835'),
      role: 'Admin',
      isPrimary,
      canDelete: !isPrimary,
      cnic: override?.cnic || d.cnic || (isPrimary ? '35201-1234567-1' : '35201-1234567-2'),
      address: override?.address || d.address || 'Operations HQ, Central Facility Complex',
      city: override?.city || d.city || 'Lahore',
      isVerified: true,
      isActive: effectiveActive,
      status: effectiveStatus,
      verificationStatus: 'Verified',
      serviceCategories: isPrimary ? ['Executive Governance', 'Supervisory Administration'] : ['Executive Operations', 'Supervisory Administration'],
      specialization: isPrimary ? 'Primary Administrator & Ownership' : 'System Administration & Operations',
      experienceYears: isPrimary ? '10' : (d.experienceYears || '8'),
      hasLoggedIn: d.hasLoggedIn ?? isPrimary,
      lastLoginAt: d.lastLoginAt,
      totalRequests: 0,
      acceptedRequests: 0,
      cancelledOrRefused: 0,
      inProgress: 0,
      rating: Number((d as any).rating ?? (d as any).averageRating ?? 0.0),
      averageRating: Number((d as any).averageRating ?? (d as any).rating ?? 0.0),
      completedJobs: 0,
      totalEarnings: 'PKR 0',
      purchasedPoints: isPrimary ? 10000 : 5000,
      bankDepositPkr: isPrimary ? 'PKR 1,000,000' : 'PKR 500,000',
      registeredDate: d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Jan 01, 2026',
    };

    if (isPrimary) {
      admins.unshift(adminObj);
    } else {
      admins.push(adminObj);
    }
  }

    for (const u of IN_MEMORY_USERS) {
      if (u.role !== 'Admin') continue;
      if (isDefaultAdminUser(u._id) || isDefaultAdminUser(u.email)) continue;
      if (isUserDeleted(u)) continue;
      if (admins.some(a => a.email.toLowerCase() === u.email.toLowerCase() || a._id === u._id)) continue;

      const isSuspended = (u.isActive === false || (u as any).status === 'Suspended') && 
                          (u as any).suspendedUntil && new Date() < new Date((u as any).suspendedUntil);
      const isExpired = (u as any).suspendedUntil && new Date() >= new Date((u as any).suspendedUntil);
      const effectiveActive = isSuspended ? false : (isExpired ? true : (u.isActive !== false));
      const effectiveStatus = isSuspended ? 'Suspended' : (effectiveActive ? 'Active' : 'Inactive');

      admins.push({
        _id: u._id,
        id: `A#${String(u._id).slice(-4)}`,
        name: u.name,
        gender: 'boy',
        email: u.email,
        phone: u.phone || '+92 300 1234567',
        role: 'Admin',
        cnic: u.cnic || '35201-1234567-2',
        address: u.address || 'Operations HQ, Central Facility Complex',
        city: 'Lahore',
        isVerified: true,
        isActive: effectiveActive,
        status: effectiveStatus,
        suspendedAt: isSuspended ? (u as any).suspendedAt : undefined,
        suspendedUntil: isSuspended ? (u as any).suspendedUntil : undefined,
        suspensionReason: isSuspended ? (u as any).suspensionReason : undefined,
        verificationStatus: 'Verified',
        serviceCategories: ['System Administration'],
        specialization: 'System Administration',
        experienceYears: '5',
        totalRequests: 0,
        acceptedRequests: 0,
        cancelledOrRefused: 0,
        inProgress: 0,
        rating: Number((u as any).rating ?? (u as any).averageRating ?? 0.0),
        averageRating: Number((u as any).averageRating ?? (u as any).rating ?? 0.0),
        completedJobs: 0,
        totalEarnings: 'PKR 0',
        purchasedPoints: 5000,
        bankDepositPkr: 'PKR 500,000',
        registeredDate: 'Today',
      });
    }

  res.json(ApiResponse.success({ clients, workers, admins, isDefaultAdmin: isCallerDefaultAdmin }, 'Operations directory retrieved successfully'));
};

/**
 * Registrations & Identity Verification queue
 */
export const getRegistrations = async (_req: AuthRequest, res: Response) => {
  let registrations: any[] = [];

  // Gather all users with verification status
  try {
    const rows = await dbQuery(`SELECT * FROM users ORDER BY created_at DESC`);
    if (rows && rows.length > 0) {
      for (const r of rows) {
        if (isUserDeleted(r)) continue;
        registrations.push({
          _id: r.id,
          id: r.id,
          name: r.name,
          email: r.email,
          phone: r.phone || '',
          role: r.role,
          cnic: r.cnic || '35201-1234567-1',
          verificationStatus: r.verification_status || (r.cnic ? 'Verified' : 'Newly Registered'),
          isVerified: r.is_verified ?? false,
          isActive: r.is_active ?? true,
          submittedAt: r.created_at || new Date(),
          documents: {
            cnicFront: '/samples/cnic-front.jpg',
            cnicBack: '/samples/cnic-back.jpg',
          }
        });
      }
    }
  } catch (_) {}

  for (const u of IN_MEMORY_USERS) {
    if (isUserDeleted(u)) continue;
    if (!registrations.some(r => r.email.toLowerCase() === u.email.toLowerCase() || r._id === u._id)) {
      registrations.push({
        _id: u._id,
        id: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        cnic: u.cnic || '',
        verificationStatus: u.verificationStatus || (u.cnic ? 'Verified' : 'Newly Registered'),
        isVerified: u.isVerified ?? false,
        isActive: u.isActive !== false,
        submittedAt: u.registeredAt || u.createdAt || new Date(),
        documents: {
          cnicFront: '/samples/cnic-front.jpg',
          cnicBack: '/samples/cnic-back.jpg',
        }
      });
    }
  }

  // Include demo worker and client
  for (const d of DEMO_USERS) {
    if ((d.role as string) === 'Admin') continue;
    if (isUserDeleted(d)) continue;
    if (!registrations.some(r => r.email.toLowerCase() === d.email.toLowerCase())) {
      registrations.push({
        _id: d._id,
        id: d._id,
        name: d.name,
        email: d.email,
        phone: d.phone,
        role: d.role,
        cnic: (d as any).cnic || '35201-9876543-1',
        verificationStatus: 'Verified',
        isVerified: true,
        isActive: true,
        submittedAt: new Date('2026-01-15'),
        documents: {
          cnicFront: '/samples/cnic-front.jpg',
          cnicBack: '/samples/cnic-back.jpg',
        }
      });
    }
  }

  res.json(ApiResponse.success(registrations, 'Registrations retrieved successfully'));
};

/**
 * User submits identity verification documents
 */
export const verifyIdentity = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const { name, cnic, phone, address, city, serviceCategories, experienceYears } = req.body;

  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const cleanCnic = cnic ? String(cnic).trim() : '';
  const digits = cleanCnic.replace(/\D/g, '');
  if (!digits || digits.length !== 13) {
    throw new ApiError(400, 'Valid 13-digit Pakistani CNIC number (format: XXXXX-XXXXXXX-X) is required.');
  }

  // Update in-memory
  const mem = IN_MEMORY_USERS.find(u => u._id === userId || (u as any).id === userId);
  if (mem) {
    if (name && typeof name === 'string' && name.trim()) mem.name = name.trim();
    mem.cnic = cleanCnic;
    if (phone && typeof phone === 'string') mem.phone = phone.trim();
    if (address && typeof address === 'string') mem.address = address.trim();
    if (city && typeof city === 'string') mem.city = city.trim();
    if (Array.isArray(serviceCategories)) mem.serviceCategories = serviceCategories;
    if (experienceYears) mem.experienceYears = String(experienceYears).trim();
    mem.cnicVerified = true;
    mem.isVerified = true;
    mem.verificationStatus = 'Verified';
    savePersistedUsers();
  }

  // Update demo
  const demo = DEMO_USERS.find(d => d._id === userId);
  if (demo) {
    if (name && typeof name === 'string' && name.trim()) demo.name = name.trim();
    (demo as any).cnic = cleanCnic;
    if (phone && typeof phone === 'string') demo.phone = phone.trim();
    (demo as any).cnicVerified = true;
    (demo as any).isVerified = true;
    (demo as any).verificationStatus = 'Verified';
  }

  // Update USER_OVERRIDES for permanent persistence across all directory and operations queries
  const overrideKey = String(userId).toLowerCase().trim();
  const existing = USER_OVERRIDES.get(overrideKey) || {};
  const updatedOverride = {
    ...existing,
    ...(name && typeof name === 'string' && name.trim() ? { name: name.trim() } : {}),
    cnic: cleanCnic,
    ...(phone && typeof phone === 'string' ? { phone: phone.trim() } : {}),
    ...(address && typeof address === 'string' ? { address: address.trim() } : {}),
    ...(city && typeof city === 'string' ? { city: city.trim() } : {}),
    ...(Array.isArray(serviceCategories) ? { serviceCategories } : {}),
    ...(experienceYears ? { experienceYears: String(experienceYears).trim() } : {}),
    cnicVerified: true,
    verificationStatus: 'Verified',
  };
  USER_OVERRIDES.set(overrideKey, updatedOverride);
  if (mem?.email) {
    USER_OVERRIDES.set(mem.email.toLowerCase().trim(), updatedOverride);
  }
  persistUserOverrides();

  // Update DB
  try {
    await dbQuery(
      `UPDATE users SET
         name = COALESCE($1, name),
         cnic = COALESCE($2, cnic),
         phone = COALESCE($3, phone),
         address = COALESCE($4, address),
         city = COALESCE($5, city),
         is_verified = true,
         cnic_verified = true,
         verification_status = 'Verified',
         updated_at = NOW()
       WHERE id::text = $6`,
      [
        name && typeof name === 'string' && name.trim() ? name.trim() : null,
        cleanCnic || null,
        phone && typeof phone === 'string' ? phone.trim() : null,
        address && typeof address === 'string' ? address.trim() : null,
        city && typeof city === 'string' ? city.trim() : null,
        userId
      ]
    );
  } catch (_) {}

  const finalUser = mem || demo || {
    id: userId,
    _id: userId,
    name: name || 'User',
    cnic: cleanCnic,
    cnicVerified: true,
    isVerified: true,
    verificationStatus: 'Verified'
  };

  res.json(ApiResponse.success(finalUser, 'Identity verified successfully'));
};

export const isUserCnicVerified = (userId: string): boolean => {
  if (!userId) return false;
  // Demo users are pre-verified
  if (
    userId === '65f000000000000000000001' ||
    userId === '65f000000000000000000002' ||
    userId === '65f000000000000000000003' ||
    userId === '65f000000000000000000004' ||
    userId === '65f000000000000000000005'
  ) {
    return true;
  }

  // Check demo user list
  const demoMatch = DEMO_USERS.find(d => matchesTargetUser(d, userId));
  if (demoMatch) return true;

  // Check USER_OVERRIDES
  const overrideKey = String(userId).toLowerCase().trim();
  const override = USER_OVERRIDES.get(overrideKey);
  if (override?.cnicVerified && override?.cnic && String(override.cnic).replace(/\D/g, '').length === 13) {
    return true;
  }

  // Check in-memory users
  const mem = IN_MEMORY_USERS.find(u => matchesTargetUser(u, userId));
  if (mem) {
    const digits = mem.cnic ? String(mem.cnic).replace(/\D/g, '') : '';
    return Boolean((mem.cnicVerified || mem.verificationStatus === 'Verified') && digits.length === 13);
  }

  return false;
};

/**
 * Admin updates verification status (Verified / Rejected)
 */
export const updateVerificationStatus = async (req: AuthRequest, res: Response) => {
  const targetId = req.params.id;
  const { status, reason } = req.body;

  const isVerified = status === 'Verified';

  // 1. In-memory
  const mem = IN_MEMORY_USERS.find(u => u._id === targetId || (u as any).id === targetId);
  if (mem) {
    mem.verificationStatus = status;
    mem.isVerified = isVerified;
    if (isVerified) mem.cnicVerified = true;
  }

  // 2. Demo
  const demo = DEMO_USERS.find(d => d._id === targetId);
  if (demo) {
    (demo as any).verificationStatus = status;
    (demo as any).isVerified = isVerified;
    if (isVerified) (demo as any).cnicVerified = true;
  }

  // 3. PostgreSQL DB
  try {
    await dbQuery(
      `UPDATE users SET verification_status = $1, is_verified = $2, updated_at = NOW() WHERE id::text = $3`,
      [status, isVerified, targetId]
    );
  } catch (_) {}

  res.json(ApiResponse.success({ id: targetId, status, isVerified, reason }, `User verification status updated to ${status}`));
};

/**
 * Switch or update active role
 */
export const switchRole = async (req: AuthRequest, res: Response) => {
  const targetId = req.params.id;
  const callerId = req.user?.userId;
  const callerRole = req.user?.role;

  if (targetId !== callerId && callerRole !== 'Admin') {
    throw new ApiError(403, 'Forbidden to switch role for another user');
  }

  const { targetRole } = req.body;
  if (!targetRole) {
    throw new ApiError(400, 'Target role is required');
  }

  // Update in-memory
  const mem = IN_MEMORY_USERS.find(u => u._id === targetId || (u as any).id === targetId);
  if (mem) {
    mem.role = targetRole;
  }

  // Update demo
  const demo = DEMO_USERS.find(d => d._id === targetId);
  if (demo) {
    demo.role = targetRole;
  }

  // Update PostgreSQL
  try {
    await dbQuery(`UPDATE users SET role = $1, updated_at = NOW() WHERE id::text = $2`, [targetRole, targetId]);
  } catch (_) {}

  res.json(ApiResponse.success({ id: targetId, role: targetRole }, `Role switched to ${targetRole}`));
};

/**
 * Designate or toggle Primary Administrator
 */
export const setPrimaryAdmin = async (req: AuthRequest, res: Response) => {
  const rawId = req.params.id;
  const targetId = Array.isArray(rawId) ? rawId[0] : (rawId || '');
  try {
    const updated = setPrimaryAdminService(targetId);
    const target = updated.find(a => a._id === targetId || a.id === targetId || a.email.toLowerCase() === targetId.toLowerCase());
    res.json(ApiResponse.success(updated, `${target?.name || 'Administrator'} is now designated as the Primary Administrator.`));
  } catch (err: any) {
    throw new ApiError(400, err.message || 'Failed to set Primary Admin.');
  }
};
