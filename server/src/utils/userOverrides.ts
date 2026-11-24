import fs from 'fs';
import path from 'path';

const getOverridesFilePath = () => {
  const candidates = [
    path.resolve(process.cwd(), 'data', 'user_overrides.json'),
    path.resolve(process.cwd(), 'server', 'data', 'user_overrides.json'),
    path.resolve(process.cwd(), '..', 'data', 'user_overrides.json'),
    'D:/Clearflow/clearflow-main/server/data/user_overrides.json',
    'D:/Clearflow/clearflow-main/data/user_overrides.json',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
};

export const USER_OVERRIDES = new Map<string, any>();

export function loadUserOverrides() {
  try {
    const filePath = getOverridesFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object') {
        Object.entries(obj).forEach(([k, v]) => {
          USER_OVERRIDES.set(k.toLowerCase().trim(), v);
        });
      }
    }
  } catch (err) {
    console.error('Failed to load user overrides:', err);
  }
}

export function persistUserOverrides() {
  try {
    const candidatePaths = [
      path.resolve(process.cwd(), 'data', 'user_overrides.json'),
      path.resolve(process.cwd(), 'server', 'data', 'user_overrides.json'),
      'D:/Clearflow/clearflow-main/server/data/user_overrides.json',
      'D:/Clearflow/clearflow-main/data/user_overrides.json',
    ];
    const obj: Record<string, any> = {};
    USER_OVERRIDES.forEach((v, k) => { obj[k] = v; });
    const content = JSON.stringify(obj, null, 2);

    for (const p of candidatePaths) {
      try {
        const dir = path.dirname(p);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(p, content, 'utf-8');
      } catch (_) {}
    }
  } catch (err) {
    console.error('Failed to persist user overrides:', err);
  }
}

// Initial load
loadUserOverrides();
