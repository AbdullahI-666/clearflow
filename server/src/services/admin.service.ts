import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { dbQuery } from '../config/db.js';

export interface RegisteredAdmin {
  _id: string;
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'Admin';
  isPrimary: boolean;
  phone: string;
  cnic: string;
  cnicVerified: boolean;
  verificationStatus: 'Verified';
  address: string;
  city: string;
  locationLat?: number;
  locationLng?: number;
  serviceCategories: string[];
  specialization: string;
  experienceYears: string;
  status: 'Active' | 'Suspended';
  isActive: boolean;
  isVerified: boolean;
  hasLoggedIn?: boolean;
  lastLoginAt?: string;
  verificationCode?: string;
  verificationCodeExpiry?: string;
  rememberMeVerified?: boolean;
  rememberedDevices?: string[];
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_ADMINS: RegisteredAdmin[] = [
  {
    _id: "adm_primary_ahsan",
    id: "A#0001",
    name: "Ahsan Khalid",
    email: "ahsankhalid9768@gmail.com",
    passwordHash: "$2b$10$29l6QqEqZte0sRf7Act3v.KP/tcR51wwz2iT.dXhkyjeSoe/Itksu",
    role: "Admin",
    isPrimary: true,
    phone: "+92 300 1234567",
    cnic: "35201-1234567-1",
    cnicVerified: true,
    verificationStatus: "Verified",
    address: "Operations HQ, Central Facility Complex",
    city: "Lahore",
    serviceCategories: ["Supervisory Operations", "Executive Governance"],
    specialization: "Primary Administrator & Ownership",
    experienceYears: "10",
    status: "Active",
    isActive: true,
    isVerified: true,
    createdAt: "2026-11-20T03:42:00.000Z",
    updatedAt: "2026-11-20T03:42:00.000Z"
  },
  {
    _id: "adm_secondary_abdullah",
    id: "A#0002",
    name: "Abdullah Ikram",
    email: "abdullahikram666@gmail.com",
    passwordHash: "$2b$10$QRG4KYgGHeUsN4QMd4Ynt.V/WAm/B2aNx52Il/A7lBXzZuS9aj73i",
    role: "Admin",
    isPrimary: false,
    phone: "+92 300 7654321",
    cnic: "35201-1234567-2",
    cnicVerified: true,
    verificationStatus: "Verified",
    address: "Operations HQ, Central Facility Complex",
    city: "Lahore",
    serviceCategories: ["Supervisory Operations", "Executive Governance"],
    specialization: "System Administration & Operations",
    experienceYears: "8",
    status: "Active",
    isActive: true,
    isVerified: true,
    createdAt: "2026-11-20T03:42:00.000Z",
    updatedAt: "2026-11-20T03:42:00.000Z"
  }
];

const getAdminsFilePath = () => {
  const candidates = [
    path.resolve(process.cwd(), 'data', 'admins.json'),
    path.resolve(process.cwd(), 'server', 'data', 'admins.json'),
    path.resolve(process.cwd(), '..', 'data', 'admins.json'),
    'D:/Clearflow/clearflow-main/server/data/admins.json',
    'D:/Clearflow/clearflow-main/data/admins.json',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
};

const ADMINS_FILE = getAdminsFilePath();

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

/**
 * Read persisted non-admin users from disk
 */
export const getPersistedUsers = (): any[] => {
  try {
    const fPath = getUsersFilePath();
    if (fs.existsSync(fPath)) {
      const raw = fs.readFileSync(fPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}
  return [];
};

/**
 * Ensure data directory exists
 */
const ensureDataDir = () => {
  const file = getAdminsFilePath();
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

/**
 * Read registered admins from persistent storage
 */
export const getRegisteredAdmins = (): RegisteredAdmin[] => {
  let list: RegisteredAdmin[] = [];
  try {
    ensureDataDir();
    const filePath = getAdminsFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    }
  } catch (err) {
    console.warn('⚠️  Could not read admins.json:', err);
  }

  // Ensure default admins always exist in the returned list
  for (const def of DEFAULT_ADMINS) {
    const exists = list.some(a => a.email.toLowerCase() === def.email.toLowerCase());
    if (!exists) {
      list.push({ ...def });
    }
  }

  return list;
};

/**
 * Persist admins array to disk
 */
export const writeRegisteredAdmins = (admins: RegisteredAdmin[]): void => {
  try {
    ensureDataDir();
    const candidatePaths = [
      path.resolve(process.cwd(), 'data', 'admins.json'),
      path.resolve(process.cwd(), 'server', 'data', 'admins.json'),
      'D:/Clearflow/clearflow-main/server/data/admins.json',
      'D:/Clearflow/clearflow-main/data/admins.json',
    ];
    for (const p of candidatePaths) {
      try {
        const d = path.dirname(p);
        if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
        fs.writeFileSync(p, JSON.stringify(admins, null, 2), 'utf-8');
      } catch (_) {}
    }
  } catch (err) {
    console.error('❌ Failed to write admins.json:', err);
  }
};

/**
 * Find admin by email or ID
 */
export const findAdminByEmailOrId = (identifier?: string): RegisteredAdmin | undefined => {
  if (!identifier) return undefined;
  const clean = String(identifier).toLowerCase().trim();
  const admins = getRegisteredAdmins();
  return admins.find(a => 
    a.email.toLowerCase() === clean || 
    a._id.toLowerCase() === clean || 
    a.id.toLowerCase() === clean ||
    clean.replace(/^a#/i, '') === a.id.toLowerCase().replace(/^a#/i, '') ||
    clean.replace(/^adm_primary_/i, '') === a.name.toLowerCase().replace(/\s+/g, '') ||
    (a.name && a.name.toLowerCase() === clean)
  );
};

/**
 * Save or create a new registered admin (maximum 2 admins)
 */
export const registerOrUpdateAdmin = async (
  email: string,
  passwordHash: string,
  name?: string
): Promise<{ admin: RegisteredAdmin; isNew: boolean }> => {
  const normEmail = email.toLowerCase().trim();
  const admins = getRegisteredAdmins();

  const existingIndex = admins.findIndex(a => a.email.toLowerCase() === normEmail);
  if (existingIndex >= 0) {
    // Existing admin: update password if changed
    admins[existingIndex].passwordHash = passwordHash;
    admins[existingIndex].updatedAt = new Date().toISOString();
    writeRegisteredAdmins(admins);
    return { admin: admins[existingIndex], isNew: false };
  }

  // Cross-portal check: Reject if email already belongs to a client or worker
  const nonAdminUsers = getPersistedUsers();
  const existingNonAdmin = nonAdminUsers.find(u => (u.email || '').toLowerCase() === normEmail);
  if (existingNonAdmin) {
    const portal = existingNonAdmin.role === 'FieldTeam' || existingNonAdmin.role === 'Worker' ? 'Worker' : 'Client';
    throw new Error(`This email address is already registered to the ${portal} portal and cannot be used for an Administrator account.`);
  }

  try {
    const dbRows = await dbQuery('SELECT role FROM users WHERE LOWER(email) = $1 LIMIT 1', [normEmail]);
    if (dbRows && dbRows.length > 0) {
      const r = dbRows[0].role;
      const portal = r === 'FieldTeam' || r === 'Worker' ? 'Worker' : 'Client';
      throw new Error(`This email address is already registered to the ${portal} portal and cannot be used for an Administrator account.`);
    }
  } catch (err: any) {
    if (err.message && err.message.includes('already registered')) throw err;
  }

  if (admins.length >= 2) {
    throw new Error('Maximum 2 administrator accounts allowed in ClearFlow. Access restricted to registered administrators.');
  }

  const isFirst = admins.length === 0;
  const adminId = isFirst ? 'A#0001' : 'A#0002';
  const rawName = name?.trim() || normEmail.split('@')[0];
  const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  const newAdmin: RegisteredAdmin = {
    _id: `adm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    id: adminId,
    name: formattedName,
    email: normEmail,
    passwordHash,
    role: 'Admin',
    isPrimary: isFirst,
    phone: isFirst ? '+92 300 1234567' : '+92 300 7654321',
    cnic: isFirst ? '35201-1234567-1' : '35201-1234567-2',
    cnicVerified: true,
    verificationStatus: 'Verified',
    address: 'Operations HQ, Central Facility Complex',
    city: 'Lahore',
    serviceCategories: ['Supervisory Operations', 'Executive Governance'],
    specialization: isFirst ? 'Primary Administrator & Ownership' : 'System Administration & Operations',
    experienceYears: isFirst ? '10' : '8',
    status: 'Active',
    isActive: true,
    isVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  admins.push(newAdmin);
  writeRegisteredAdmins(admins);

  // Sync to PostgreSQL DB if available
  try {
    await dbQuery(
      `INSERT INTO users (name, email, password_hash, role, is_verified, is_active, phone, address, city)
       VALUES ($1, $2, $3, 'Admin', true, true, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE SET password_hash = $3, role = 'Admin', is_active = true`,
      [newAdmin.name, newAdmin.email, passwordHash, newAdmin.phone, newAdmin.address, newAdmin.city]
    );
  } catch (err) {
    // DB sync error is logged, persistent JSON guarantees storage
    console.warn('⚠️  Postgres admin sync note:', (err as any).message);
  }

  return { admin: newAdmin, isNew: true };
};

/**
 * Toggle or designate Primary Admin
 */
export const setPrimaryAdmin = (adminId: string): RegisteredAdmin[] => {
  const cleanId = (adminId || '').toLowerCase().trim();
  const admins = getRegisteredAdmins();

  const target = admins.find(a => 
    a._id.toLowerCase() === cleanId || 
    a.id.toLowerCase() === cleanId || 
    a.email.toLowerCase() === cleanId
  );

  if (!target) {
    throw new Error('Target administrator account not found.');
  }

  for (const a of admins) {
    if (a._id === target._id) {
      a.isPrimary = true;
      a.specialization = 'Primary Administrator & Ownership';
      a.updatedAt = new Date().toISOString();
    } else {
      a.isPrimary = false;
      a.specialization = 'System Administration & Operations';
      a.updatedAt = new Date().toISOString();
    }
  }

  writeRegisteredAdmins(admins);
  return admins;
};
