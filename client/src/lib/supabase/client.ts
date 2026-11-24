import { createClient } from '@supabase/supabase-js';

// Resolve URL and Key safely in Vite browser environment
const envSource: Record<string, string | undefined> = 
  typeof import.meta !== 'undefined' && import.meta.env 
    ? (import.meta.env as unknown as Record<string, string | undefined>) 
    : {};

const supabaseUrl =
  envSource.VITE_SUPABASE_URL ||
  envSource.NEXT_PUBLIC_SUPABASE_URL ||
  '';

const supabaseAnonKey =
  envSource.VITE_SUPABASE_PUBLISHABLE_KEY ||
  envSource.VITE_SUPABASE_ANON_KEY ||
  envSource.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

/**
 * Universal Supabase Browser Client
 * Works smoothly in Vite React and client-side modules
 */
export function createBrowserClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase = createBrowserClient();
export default supabase;
