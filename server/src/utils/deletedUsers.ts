import fs from 'fs';
import path from 'path';

const getDeletedUsersFilePath = () => {
  const candidates = [
    path.resolve(process.cwd(), 'data', 'deleted_users.json'),
    path.resolve(process.cwd(), 'server', 'data', 'deleted_users.json'),
    path.resolve(process.cwd(), '..', 'data', 'deleted_users.json'),
    'D:/Clearflow/clearflow-main/server/data/deleted_users.json',
    'D:/Clearflow/clearflow-main/data/deleted_users.json',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
};

export const DELETED_USER_IDS = new Set<string>([
  'ahsankhalid@icloud.com',
  'client.ahsan@clearflow.com',
  'worker.ahsan@clearflow.com',
  'ahsan malik',
]);

export function loadPersistedDeletedUsers() {
  try {
    const filePath = getDeletedUsersFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
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
  } catch (_) {}
}

export function persistDeletedUsers() {
  try {
    const candidatePaths = [
      path.resolve(process.cwd(), 'data', 'deleted_users.json'),
      path.resolve(process.cwd(), 'server', 'data', 'deleted_users.json'),
      'D:/Clearflow/clearflow-main/server/data/deleted_users.json',
      'D:/Clearflow/clearflow-main/data/deleted_users.json',
    ];
    const content = JSON.stringify(Array.from(DELETED_USER_IDS), null, 2);
    for (const p of candidatePaths) {
      try {
        const dir = path.dirname(p);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(p, content, 'utf-8');
      } catch (_) {}
    }
  } catch (err) {
    console.error('Failed to persist deleted users:', err);
  }
}

const PROTECTED_CORE_KEYS = new Set([
  'admin@clearflow.com',
  'ahsankhalid9768@gmail.com',
  'abdullahikram666@gmail.com',
  'adm_primary_ahsan',
  'adm_secondary_abdullah',
  'a#0001',
  'a#0002',
]);

export function isUserDeleted(u: any): boolean {
  if (!u) return false;
  const idStr = String(u._id || u.id || '').toLowerCase().trim();
  const stripped = idStr.replace(/^[acw]#/i, '');
  const email = String(u.email || '').toLowerCase().trim();

  // Core accounts (Admin 1, Hassan, Ahsan) can NEVER be deleted
  if (
    PROTECTED_CORE_KEYS.has(email) ||
    PROTECTED_CORE_KEYS.has(idStr) ||
    PROTECTED_CORE_KEYS.has(stripped)
  ) {
    return false;
  }

  if (idStr && DELETED_USER_IDS.has(idStr)) return true;
  if (stripped && DELETED_USER_IDS.has(stripped)) return true;
  if (email && DELETED_USER_IDS.has(email)) return true;
  if (Array.isArray(u.aliases)) {
    if (u.aliases.some((a: string) => DELETED_USER_IDS.has(String(a).toLowerCase().trim()))) return true;
  }
  return false;
}

loadPersistedDeletedUsers();
