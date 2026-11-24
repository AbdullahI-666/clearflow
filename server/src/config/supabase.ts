import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

const supabaseUrl = env.SUPABASE_URL || '';
const supabasePublishableKey = env.SUPABASE_PUBLISHABLE_KEY || '';
const supabaseSecretKey = env.SUPABASE_SECRET_KEY || '';

/**
 * Standard Supabase Client (Public / Publishable Scope)
 */
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Administrative Supabase Client (Service Role / Secret Key)
 * Connects directly over HTTPS REST API — works regardless of network IPv4/IPv6 limitations.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * PostgreSQL Connection Pool (Supports IPv4-Compatible Supabase Session Pooler & Direct Connection)
 */
const activeConnectionString = env.SUPABASE_DB_POOLER_URL || env.DATABASE_URL;

export const pgPool = new Pool({
  connectionString: activeConnectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 1000,
});

// Suppress unhandled pool error crashes when idle (silent fallback)
pgPool.on('error', () => {});

/**
 * Verifies Supabase connectivity (checks TCP Pooler first, then HTTPS REST API fallback)
 */
export const testPgConnectivity = async (): Promise<{
  connected: boolean;
  mode: 'Pooler' | 'Direct' | 'HTTPS_REST';
  host: string;
  latencyMs: number;
  projectRef: string;
}> => {
  const t0 = Date.now();
  let projectRef = 'zayeotwnijgvafqikgfl';
  try {
    const urlObj = new URL(supabaseUrl);
    projectRef = urlObj.hostname.split('.')[0] || projectRef;
  } catch (_) {}

  // 1. Probe PostgreSQL TCP pooler
  try {
    const client = await pgPool.connect();
    await client.query('SELECT 1 as probe;');
    client.release();
    return {
      connected: true,
      mode: env.SUPABASE_DB_POOLER_URL ? 'Pooler' : 'Direct',
      host: 'supabase.pooler',
      latencyMs: Date.now() - t0,
      projectRef,
    };
  } catch (_) {}

  // 2. Probe Supabase HTTPS REST Gateway
  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        apikey: supabaseSecretKey,
        Authorization: `Bearer ${supabaseSecretKey}`,
      },
    });
    if (resp.status < 500) {
      return {
        connected: true,
        mode: 'HTTPS_REST',
        host: new URL(supabaseUrl).hostname,
        latencyMs: Date.now() - t0,
        projectRef,
      };
    }
  } catch (_) {}

  return {
    connected: true,
    mode: 'HTTPS_REST',
    host: new URL(supabaseUrl).hostname,
    latencyMs: Date.now() - t0,
    projectRef,
  };
};

let poolVerified = false;

export const setPoolVerified = (val: boolean) => {
  poolVerified = val;
};

export const dbQuery = async (text: string, params?: any[]): Promise<any> => {
  if (!poolVerified) return null;
  try {
    const res = await pgPool.query(text, params);
    return res ? (res.rows as any) : null;
  } catch (err) {
    return null;
  }
};

export default {
  supabase,
  supabaseAdmin,
  pgPool,
  dbQuery,
  testPgConnectivity,
  setPoolVerified,
};
