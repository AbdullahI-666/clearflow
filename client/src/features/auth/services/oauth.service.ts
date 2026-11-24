import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';

/**
 * Generates PKCE code_verifier and code_challenge for secure Google OAuth 2.0 flow
 */
export async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  const codeVerifier = Array.from(array, dec => ('0' + dec.toString(16)).slice(-2)).join('');

  // SHA-256 hash of verifier
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);

  // Base64URL encode
  const base64Digest = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return { codeVerifier, codeChallenge: base64Digest };
}

export interface OAuthUrlResponse {
  url: string;
  state: string;
  isConfigured: boolean;
}

/**
 * Initiates official Google OAuth 2.0 flow
 */
export async function initiateGoogleOAuth(
  role: 'client' | 'fieldteam' | 'admin' = 'client',
  mode: 'signin' | 'register' = 'signin'
): Promise<OAuthUrlResponse> {
  const { codeVerifier, codeChallenge } = await generatePKCE();
  sessionStorage.setItem('cf_google_code_verifier', codeVerifier);

  const res = await apiClient.get<{ success: boolean; data: OAuthUrlResponse }>(
    ENDPOINTS.AUTH.GOOGLE_OAUTH_URL,
    {
      params: {
        role,
        mode,
        codeChallenge,
        clientOrigin: window.location.origin,
      },
    }
  );

  const data = res.data?.data || (res.data as any);
  if (data?.state) {
    sessionStorage.setItem('cf_oauth_state', data.state);
  }

  return data;
}

/**
 * Initiates official Sign in with Apple flow
 */
export async function initiateAppleOAuth(
  role: 'client' | 'fieldteam' | 'admin' = 'client',
  mode: 'signin' | 'register' = 'signin'
): Promise<OAuthUrlResponse> {
  const res = await apiClient.get<{ success: boolean; data: OAuthUrlResponse }>(
    ENDPOINTS.AUTH.APPLE_OAUTH_URL,
    {
      params: {
        role,
        mode,
        clientOrigin: window.location.origin,
      },
    }
  );

  const data = res.data?.data || (res.data as any);
  if (data?.state) {
    sessionStorage.setItem('cf_oauth_state', data.state);
  }

  return data;
}

/**
 * Completes Google OAuth by exchanging authorization code on the ClearFlow backend
 */
export async function completeGoogleOAuth(code: string, state: string, codeVerifier?: string) {
  const res = await apiClient.post(ENDPOINTS.AUTH.GOOGLE_OAUTH_CALLBACK, {
    code,
    state,
    codeVerifier: codeVerifier || sessionStorage.getItem('cf_google_code_verifier') || undefined,
    redirectUri: `${window.location.origin}/auth/callback/google`,
  });
  return res.data?.data || res.data;
}

/**
 * Completes Apple Sign-In by validating token on the ClearFlow backend
 */
export async function completeAppleOAuth(idToken: string, code?: string, state?: string, user?: any) {
  const res = await apiClient.post(ENDPOINTS.AUTH.APPLE_OAUTH_CALLBACK, {
    id_token: idToken,
    code,
    state: state || sessionStorage.getItem('cf_oauth_state') || undefined,
    user,
    redirectUri: `${window.location.origin}/auth/callback/apple`,
  });
  return res.data?.data || res.data;
}
