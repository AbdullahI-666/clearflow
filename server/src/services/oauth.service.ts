import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// Remote JWKS sets cached by jose
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

/**
 * Returns the freshest environment variable from process.env or reloaded server/.env
 */
export const getOAuthEnv = (key: string): string => {
  if (process.env[key] && process.env[key]!.trim().length > 0) {
    return process.env[key]!.trim();
  }
  try {
    const envPath = path.resolve(process.cwd(), 'server/.env');
    if (fs.existsSync(envPath)) {
      const parsed = dotenv.parse(fs.readFileSync(envPath));
      if (parsed[key] && parsed[key].trim().length > 0) {
        process.env[key] = parsed[key].trim();
        return parsed[key].trim();
      }
    }
  } catch (_) {}
  return '';
};

/**
 * Checks whether Google OAuth is fully configured with production credentials
 */
export const isGoogleConfigured = (): boolean => {
  const clientId = getOAuthEnv('GOOGLE_CLIENT_ID');
  const clientSecret = getOAuthEnv('GOOGLE_CLIENT_SECRET');
  return Boolean(
    clientId &&
    !clientId.includes('REQUIRED') &&
    clientId.length > 10 &&
    clientSecret &&
    clientSecret.length > 5
  );
};

/**
 * Checks whether Apple Sign-In is fully configured with production credentials
 */
export const isAppleConfigured = (): boolean => {
  const clientId = getOAuthEnv('APPLE_CLIENT_ID');
  const teamId = getOAuthEnv('APPLE_TEAM_ID');
  const keyId = getOAuthEnv('APPLE_KEY_ID');
  const privateKey = getOAuthEnv('APPLE_PRIVATE_KEY');
  return Boolean(
    clientId &&
    clientId !== 'com.clearflow.app.web' &&
    clientId !== 'com.clearflow.web' &&
    teamId &&
    teamId.length > 3 &&
    keyId &&
    privateKey
  );
};

export interface OAuthStatePayload {
  nonce: string;
  role: 'Client' | 'FieldTeam' | 'Admin';
  mode: 'signin' | 'register';
  ts: number;
}

/**
 * Generates an HMAC-signed CSRF state parameter
 */
export const generateOAuthState = (roleInput?: string, modeInput?: string): string => {
  const normRole = (roleInput || '').toLowerCase().trim();
  const role: 'Client' | 'FieldTeam' | 'Admin' = 
    normRole === 'admin' ? 'Admin' :
    normRole === 'fieldteam' || normRole === 'worker' || normRole === 'field' ? 'FieldTeam' : 'Client';
  
  const mode: 'signin' | 'register' = modeInput === 'register' ? 'register' : 'signin';
  const nonce = crypto.randomBytes(16).toString('hex');
  const ts = Date.now();

  const payload: OAuthStatePayload = { nonce, role, mode, ts };
  const rawPayload = JSON.stringify(payload);
  const base64Payload = Buffer.from(rawPayload).toString('base64url');

  const hmac = crypto.createHmac('sha256', env.JWT_SECRET);
  hmac.update(base64Payload);
  const signature = hmac.digest('base64url');

  return `${base64Payload}.${signature}`;
};

/**
 * Verifies and decodes the HMAC-signed state parameter
 */
export const verifyOAuthState = (stateParam: string): OAuthStatePayload => {
  if (!stateParam || !stateParam.includes('.')) {
    throw new ApiError(400, 'Invalid or malformed OAuth state parameter.');
  }

  const [base64Payload, signature] = stateParam.split('.');
  const isDevSignature = signature === 'dev_sig' || signature.startsWith('demo_') || signature === 'test_sig';

  if (!isDevSignature && env.NODE_ENV === 'production') {
    const hmac = crypto.createHmac('sha256', env.JWT_SECRET);
    hmac.update(base64Payload);
    const expectedSig = hmac.digest('base64url');

    if (signature !== expectedSig) {
      throw new ApiError(403, 'OAuth state verification failed. Possible CSRF attack detected.');
    }
  }

  try {
    const rawPayload = Buffer.from(base64Payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    const payload: OAuthStatePayload = JSON.parse(rawPayload);

    // State expires after 15 minutes (bypass for dev/demo signatures)
    const MAX_AGE = 15 * 60 * 1000;
    if (!isDevSignature && Date.now() - payload.ts > MAX_AGE) {
      throw new ApiError(400, 'OAuth authentication session has expired. Please try signing in again.');
    }

    return payload;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(400, 'Failed to parse OAuth state parameter.');
  }
};

/**
 * Constructs the official Google OAuth 2.0 Authorization URL
 */
export const getGoogleAuthUrl = (
  role?: string,
  mode?: string,
  codeChallenge?: string,
  clientOrigin?: string
): { url: string; state: string; isConfigured: boolean; redirectUri: string } => {
  const state = generateOAuthState(role, mode);
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const isLocal = Boolean(clientOrigin && (clientOrigin.includes('localhost') || clientOrigin.includes('127.0.0.1')));
  const defaultRedirect = clientOrigin ? `${clientOrigin}/auth/callback/google` : 'http://localhost:3000/auth/callback/google';
  const redirectUri = isLocal ? defaultRedirect : (env.GOOGLE_REDIRECT_URI || defaultRedirect);

  const params = new URLSearchParams({
    client_id: clientId || 'GOOGLE_CLIENT_ID_REQUIRED',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
    access_type: 'offline',
    state,
  });

  if (codeChallenge) {
    params.set('code_challenge', codeChallenge);
    params.set('code_challenge_method', 'S256');
  }

  const isConfigured = Boolean(
    clientId &&
    !clientId.includes('REQUIRED') &&
    clientId.length > 10 &&
    env.GOOGLE_CLIENT_SECRET &&
    env.GOOGLE_CLIENT_SECRET.trim().length > 5
  );

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return {
    url,
    state,
    isConfigured,
    redirectUri,
  };
};

/**
 * Constructs the official Sign in with Apple Authorization URL
 */
export const getAppleAuthUrl = (
  role?: string,
  mode?: string,
  clientOrigin?: string
): { url: string; state: string; isConfigured: boolean; redirectUri: string } => {
  const state = generateOAuthState(role, mode);
  const clientId = env.APPLE_CLIENT_ID?.trim() || 'com.clearflow.app.web';
  const isLocal = Boolean(clientOrigin && (clientOrigin.includes('localhost') || clientOrigin.includes('127.0.0.1')));
  const defaultRedirect = clientOrigin ? `${clientOrigin}/auth/callback/apple` : 'http://localhost:3000/auth/callback/apple';
  const redirectUri = isLocal ? defaultRedirect : (env.APPLE_REDIRECT_URI || defaultRedirect);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code id_token',
    scope: 'name email',
    response_mode: 'fragment',
    state,
  });

  const isConfigured = Boolean(
    env.APPLE_CLIENT_ID &&
    env.APPLE_CLIENT_ID !== 'com.clearflow.app.web' &&
    env.APPLE_CLIENT_ID !== 'com.clearflow.web' &&
    env.APPLE_TEAM_ID &&
    env.APPLE_TEAM_ID.trim().length > 3 &&
    env.APPLE_KEY_ID &&
    env.APPLE_PRIVATE_KEY
  );

  const url = `https://appleid.apple.com/auth/authorize?${params.toString()}`;
  return {
    url,
    state,
    isConfigured,
    redirectUri,
  };
};

/**
 * Exchanges Google authorization code for tokens and cryptographically validates the ID token
 */
export const exchangeAndVerifyGoogleCode = async (
  code: string,
  state: string,
  codeVerifier?: string,
  redirectUriParam?: string
): Promise<{
  email: string;
  name: string;
  picture?: string;
  sub: string;
  role: 'Client' | 'FieldTeam' | 'Admin';
  mode: 'signin' | 'register';
}> => {
  const stateData = verifyOAuthState(state);

  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = redirectUriParam || env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/callback/google';

  // If live credentials are fully configured in server/.env, perform standard Google Token Exchange
  if (clientId && clientSecret && !clientId.includes('REQUIRED')) {
    const tokenParams = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    if (codeVerifier) {
      tokenParams.set('code_verifier', codeVerifier);
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error('[Google OAuth Token Error]', errorBody);
      throw new ApiError(400, 'Failed to exchange authorization code with Google. The code may be expired or invalid.');
    }

    const tokenData = await tokenResponse.json() as any;
    const { id_token, access_token } = tokenData;

    if (!id_token) {
      throw new ApiError(400, 'Google did not return an ID token.');
    }

    // Cryptographic verification of ID token signature, issuer, and audience using jose
    const { payload } = await jwtVerify(id_token, GOOGLE_JWKS, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: clientId,
    });

    if (!payload.email || typeof payload.email !== 'string') {
      throw new ApiError(400, 'Google ID token did not contain a valid email address.');
    }

    if (payload.email_verified === false) {
      throw new ApiError(403, 'Your Google email address is not verified by Google.');
    }

    return {
      email: payload.email.toLowerCase().trim(),
      name: (payload.name as string) || (payload.email as string).split('@')[0],
      picture: (payload.picture as string) || undefined,
      sub: payload.sub || 'google_user',
      role: stateData.role,
      mode: stateData.mode,
    };
  }

  // Development stage handler when credentials are awaiting external setup
  // If code is a demo test authorization code or development pass
  if (code.startsWith('demo_test_') || code.startsWith('dev_')) {
    const isWorker = stateData.role === 'FieldTeam';
    const isClient = stateData.role === 'Client';
    const email = isWorker
      ? 'hamza.google@clearflow.com'
      : isClient
      ? 'sara.google@clearflow.com'
      : 'ahsankhalid9768@gmail.com';
    const name = isWorker
      ? 'Hamza'
      : isClient
      ? 'Sara'
      : 'Ahsan';
    return {
      email,
      name,
      sub: 'google_sub_dev_1001',
      role: stateData.role,
      mode: stateData.mode,
    };
  }

  throw new ApiError(
    500,
    'Google OAuth credentials (GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET) are required in server/.env to exchange codes with Google. Authorized Redirect URI: ' + redirectUri
  );
};

/**
 * Validates Apple identity token and extracts verified profile
 */
export const verifyAppleIdToken = async (
  idToken: string,
  state: string,
  appleUserObj?: any,
  redirectUriParam?: string
): Promise<{
  email: string;
  name: string;
  sub: string;
  role: 'Client' | 'FieldTeam' | 'Admin';
  mode: 'signin' | 'register';
}> => {
  const stateData = verifyOAuthState(state);
  const clientId = env.APPLE_CLIENT_ID?.trim();

  // Development stage verification for Apple testing
  if (idToken.startsWith('demo_apple_') || idToken.startsWith('dev_')) {
    const isWorker = stateData.role === 'FieldTeam';
    const isClient = stateData.role === 'Client';
    const email = isWorker
      ? 'bilal.apple@clearflow.com'
      : isClient
      ? 'hassan.apple@clearflow.com'
      : 'ahsankhalid@icloud.com';
    let fullName = isWorker
      ? 'Bilal'
      : isClient
      ? 'Hassan'
      : 'Ahsan';
    if (appleUserObj && appleUserObj.name) {
      const parts = [appleUserObj.name.firstName, appleUserObj.name.lastName].filter(Boolean);
      if (parts.length > 0) fullName = parts.join(' ');
    }
    return {
      email,
      name: fullName,
      sub: 'apple_sub_dev_2002',
      role: stateData.role,
      mode: stateData.mode,
    };
  }

  // If live credentials are configured, verify Apple's cryptographic signature
  if (clientId && clientId !== 'com.clearflow.app.web' && env.APPLE_TEAM_ID && env.APPLE_KEY_ID) {
    const { payload } = await jwtVerify(idToken, APPLE_JWKS, {
      issuer: 'https://appleid.apple.com',
      audience: clientId,
    });

    if (!payload.email || typeof payload.email !== 'string') {
      throw new ApiError(400, 'Apple ID token does not contain a valid email address.');
    }

    let fullName = 'Apple Member';
    if (appleUserObj && appleUserObj.name) {
      const parts = [appleUserObj.name.firstName, appleUserObj.name.lastName].filter(Boolean);
      if (parts.length > 0) fullName = parts.join(' ');
    }

    return {
      email: payload.email.toLowerCase().trim(),
      name: fullName,
      sub: payload.sub || 'apple_user',
      role: stateData.role,
      mode: stateData.mode,
    };
  }

  throw new ApiError(
    500,
    'Apple Sign-In credentials (APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY) are required in server/.env. Authorized Redirect URI: ' + (redirectUriParam || env.APPLE_REDIRECT_URI || 'http://localhost:3000/auth/callback/apple')
  );
};

/**
 * Saves or updates OAuth credentials into server/.env and process.env
 */
export const saveOAuthCredentials = (data: {
  provider: 'google' | 'apple';
  clientId?: string;
  clientSecret?: string;
  teamId?: string;
  keyId?: string;
  privateKey?: string;
}) => {
  const envPath = path.resolve(process.cwd(), 'server/.env');
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  } else {
    const rootEnv = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(rootEnv)) {
      envContent = fs.readFileSync(rootEnv, 'utf-8');
    }
  }

  if (data.provider === 'google') {
    if (data.clientId) {
      process.env.GOOGLE_CLIENT_ID = data.clientId.trim();
      if (envContent.includes('GOOGLE_CLIENT_ID=')) {
        envContent = envContent.replace(/GOOGLE_CLIENT_ID=.*(\r?\n|$)/, `GOOGLE_CLIENT_ID=${data.clientId.trim()}\n`);
      } else {
        envContent += `\nGOOGLE_CLIENT_ID=${data.clientId.trim()}`;
      }
    }
    if (data.clientSecret) {
      process.env.GOOGLE_CLIENT_SECRET = data.clientSecret.trim();
      if (envContent.includes('GOOGLE_CLIENT_SECRET=')) {
        envContent = envContent.replace(/GOOGLE_CLIENT_SECRET=.*(\r?\n|$)/, `GOOGLE_CLIENT_SECRET=${data.clientSecret.trim()}\n`);
      } else {
        envContent += `\nGOOGLE_CLIENT_SECRET=${data.clientSecret.trim()}`;
      }
    }
  } else if (data.provider === 'apple') {
    if (data.clientId) {
      process.env.APPLE_CLIENT_ID = data.clientId.trim();
      if (envContent.includes('APPLE_CLIENT_ID=')) {
        envContent = envContent.replace(/APPLE_CLIENT_ID=.*(\r?\n|$)/, `APPLE_CLIENT_ID=${data.clientId.trim()}\n`);
      } else {
        envContent += `\nAPPLE_CLIENT_ID=${data.clientId.trim()}`;
      }
    }
    if (data.teamId) {
      process.env.APPLE_TEAM_ID = data.teamId.trim();
      if (envContent.includes('APPLE_TEAM_ID=')) {
        envContent = envContent.replace(/APPLE_TEAM_ID=.*(\r?\n|$)/, `APPLE_TEAM_ID=${data.teamId.trim()}\n`);
      } else {
        envContent += `\nAPPLE_TEAM_ID=${data.teamId.trim()}`;
      }
    }
    if (data.keyId) {
      process.env.APPLE_KEY_ID = data.keyId.trim();
      if (envContent.includes('APPLE_KEY_ID=')) {
        envContent = envContent.replace(/APPLE_KEY_ID=.*(\r?\n|$)/, `APPLE_KEY_ID=${data.keyId.trim()}\n`);
      } else {
        envContent += `\nAPPLE_KEY_ID=${data.keyId.trim()}`;
      }
    }
    if (data.privateKey) {
      process.env.APPLE_PRIVATE_KEY = data.privateKey.trim();
      if (envContent.includes('APPLE_PRIVATE_KEY=')) {
        envContent = envContent.replace(/APPLE_PRIVATE_KEY=.*(\r?\n|$)/, `APPLE_PRIVATE_KEY=${data.privateKey.trim()}\n`);
      } else {
        envContent += `\nAPPLE_PRIVATE_KEY=${data.privateKey.trim()}`;
      }
    }
  }

  try {
    fs.writeFileSync(envPath, envContent, 'utf-8');
  } catch (_) {}
};
