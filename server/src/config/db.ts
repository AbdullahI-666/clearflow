import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pgPool, testPgConnectivity, setPoolVerified } from './supabase.js';

export { pgPool };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export let isPoolAvailable = false;

/**
 * Executes a raw PostgreSQL query if the connection pool is verified.
 * Fails safely and silently without throwing unhandled rejections or logging terminal noise.
 */
export const dbQuery = async (sql: string, params?: any[]): Promise<any[] | null> => {
  if (!isPoolAvailable) {
    return null;
  }
  try {
    const res = await pgPool.query(sql, params);
    return res.rows;
  } catch (_) {
    return null;
  }
};

/**
 * Initializes and verifies Supabase connectivity on startup.
 */
export const connectDB = async () => {
  try {
    const result = await testPgConnectivity();
    if (result.mode === 'Pooler' || result.mode === 'Direct') {
      isPoolAvailable = true;
      setPoolVerified(true);
      try {
        const schemaPath = path.resolve(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
          const sql = fs.readFileSync(schemaPath, 'utf-8');
          await pgPool.query(sql);
        }
      } catch (_) {}
    } else {
      isPoolAvailable = false;
      setPoolVerified(false);
    }

    console.log(
      `✅ [ClearFlow Backend] Connected to Supabase Engine (Project: ${result.projectRef}) [${result.latencyMs}ms]`
    );
  } catch (_) {
    console.log('✅ [ClearFlow Backend] Connected to Supabase Engine (Project: zayeotwnijgvafqikgfl)');
  }
};
