import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import * as authService from '../services/auth.service.js';
import * as oauthService from '../services/oauth.service.js';
import { getEmailLogs } from '../services/email.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { emitUserRegistered, emitNotification } from '../socket/index.js';
import * as notifService from '../services/notification.service.js';

export const register = async (req: Request, res: Response) => {
  const { name, email, password, role, phone } = req.body;
  const originBaseUrl = (req.headers.origin as string) || (req.headers.referer ? new URL(req.headers.referer as string).origin : '') || '';
  const result = await authService.register(name, email, password, role, phone, originBaseUrl);

  try {
    const registeredUser = (result as any).user || { name, email, role, phone };
    emitUserRegistered(registeredUser);
    await notifService.create({
      roles: ['Admin'],
      type: 'AccountCreated' as any,
      title: `New ${role === 'FieldTeam' ? 'Worker' : role} Registered`,
      message: `${name} (${email}) has registered as a new ${role === 'FieldTeam' ? 'Worker' : role}.`,
      metadata: { userId: (registeredUser as any)._id || (registeredUser as any).id, role, email, name },
    });
  } catch (_) {}

  res.status(201).json(ApiResponse.created(result, result.message || 'Registration successful'));
};

export const login = async (req: Request, res: Response) => {
  const { email, username, identifier, password, selectedRole, rememberMe, deviceId } = req.body;
  const loginIdentifier = (email || username || identifier || '').trim();
  const originBaseUrl = (req.headers.origin as string) || (req.headers.referer ? new URL(req.headers.referer as string).origin : '') || '';
  const result = await authService.login(loginIdentifier, password, selectedRole, originBaseUrl, Boolean(rememberMe), typeof deviceId === 'string' ? deviceId : undefined);
  res.json(ApiResponse.success(result, (result as any).message || 'Login successful'));
};

export const oauthLoginOrRegister = async (req: Request, res: Response) => {
  const { provider, email, name, role, photoUrl } = req.body;
  const originBaseUrl = (req.headers.origin as string) || (req.headers.referer ? new URL(req.headers.referer as string).origin : '') || '';
  const result = await authService.oauthLoginOrRegister(provider, email, name, role, originBaseUrl, photoUrl);

  try {
    if ((result as any).isNewUser) {
      const registeredUser = (result as any).user || { name, email, role };
      emitUserRegistered(registeredUser);
      await notifService.create({
        roles: ['Admin'],
        type: 'AccountCreated' as any,
        title: `New ${registeredUser.role === 'FieldTeam' ? 'Worker' : registeredUser.role} via ${provider === 'apple' ? 'Apple' : 'Google'}`,
        message: `${registeredUser.name} (${registeredUser.email}) registered via ${provider === 'apple' ? 'Apple' : 'Google'}.`,
        metadata: { userId: (registeredUser as any)._id || (registeredUser as any).id, role: registeredUser.role, email: registeredUser.email, name: registeredUser.name },
      });
    }
  } catch (_) {}

  res.json(ApiResponse.success(result, (result as any).message || 'Authentication successful'));
};

/**
 * Get official Google OAuth 2.0 Authorization URL
 */
export const getGoogleOAuthUrl = async (req: Request, res: Response) => {
  const { role, mode, codeChallenge, clientOrigin } = req.query;
  const origin = (typeof clientOrigin === 'string' && clientOrigin) || (req.headers.origin as string) || (req.headers.referer ? new URL(req.headers.referer as string).origin : '') || '';
  const result = oauthService.getGoogleAuthUrl(
    typeof role === 'string' ? role : undefined,
    typeof mode === 'string' ? mode : undefined,
    typeof codeChallenge === 'string' ? codeChallenge : undefined,
    origin
  );
  res.json(ApiResponse.success(result, 'Google authorization URL generated'));
};

/**
 * Handle official Google OAuth 2.0 Authorization Code callback
 */
export const handleGoogleOAuthCallback = async (req: Request, res: Response) => {
  const { code, state, codeVerifier, redirectUri } = req.body;
  const originBaseUrl = (req.headers.origin as string) || (req.headers.referer ? new URL(req.headers.referer as string).origin : '') || '';
  const resolvedRedirectUri = redirectUri || (originBaseUrl ? `${originBaseUrl}/auth/callback/google` : undefined);

  // 1. Verify state and exchange code with Google
  const profile = await oauthService.exchangeAndVerifyGoogleCode(code, state, codeVerifier, resolvedRedirectUri);

  // 2. Login or Register the user in ClearFlow database
  const result = await authService.oauthLoginOrRegister(
    'google',
    profile.email,
    profile.name,
    profile.role,
    originBaseUrl,
    profile.picture
  );

  // 3. Emit notification if new user created
  try {
    if ((result as any).isNewUser) {
      const registeredUser = (result as any).user || { name: profile.name, email: profile.email, role: profile.role };
      emitUserRegistered(registeredUser);
      await notifService.create({
        roles: ['Admin'],
        type: 'AccountCreated' as any,
        title: `New ${registeredUser.role === 'FieldTeam' ? 'Worker' : registeredUser.role} via Google`,
        message: `${registeredUser.name} (${registeredUser.email}) joined ClearFlow via Google OAuth.`,
        metadata: { userId: (registeredUser as any)._id || (registeredUser as any).id, role: registeredUser.role, email: registeredUser.email, name: registeredUser.name },
      });
    }
  } catch (_) {}

  res.json(ApiResponse.success(result, (result as any).message || 'Google authentication successful.'));
};

/**
 * Get official Sign in with Apple Authorization URL
 */
export const getAppleOAuthUrl = async (req: Request, res: Response) => {
  const { role, mode, clientOrigin } = req.query;
  const origin = (typeof clientOrigin === 'string' && clientOrigin) || (req.headers.origin as string) || (req.headers.referer ? new URL(req.headers.referer as string).origin : '') || '';
  const result = oauthService.getAppleAuthUrl(
    typeof role === 'string' ? role : undefined,
    typeof mode === 'string' ? mode : undefined,
    origin
  );
  res.json(ApiResponse.success(result, 'Apple authorization URL generated'));
};

/**
 * Handle official Sign in with Apple callback
 */
export const handleAppleOAuthCallback = async (req: Request, res: Response) => {
  const { id_token, code, user, state, redirectUri } = req.body;
  const originBaseUrl = (req.headers.origin as string) || (req.headers.referer ? new URL(req.headers.referer as string).origin : '') || '';
  const resolvedRedirectUri = redirectUri || (originBaseUrl ? `${originBaseUrl}/auth/callback/apple` : undefined);

  // 1. Verify state and identity token from Apple
  const profile = await oauthService.verifyAppleIdToken(id_token || code, state, user, resolvedRedirectUri);

  // 2. Login or Register in ClearFlow database
  const result = await authService.oauthLoginOrRegister(
    'apple',
    profile.email,
    profile.name,
    profile.role,
    originBaseUrl
  );

  // 3. Emit notification if new user created
  try {
    if ((result as any).isNewUser) {
      const registeredUser = (result as any).user || { name: profile.name, email: profile.email, role: profile.role };
      emitUserRegistered(registeredUser);
      await notifService.create({
        roles: ['Admin'],
        type: 'AccountCreated' as any,
        title: `New ${registeredUser.role === 'FieldTeam' ? 'Worker' : registeredUser.role} via Apple`,
        message: `${registeredUser.name} (${registeredUser.email}) joined ClearFlow via Sign in with Apple.`,
        metadata: { userId: (registeredUser as any)._id || (registeredUser as any).id, role: registeredUser.role, email: registeredUser.email, name: registeredUser.name },
      });
    }
  } catch (_) {}

  res.json(ApiResponse.success(result, (result as any).message || 'Apple authentication successful.'));
};

export const verifyLoginCode = async (req: Request, res: Response) => {
  const { email, username, identifier, code, rememberMe, deviceId } = req.body;
  const loginIdentifier = (email || username || identifier || '').trim();
  const result = await authService.verifyLoginCode(loginIdentifier, code, Boolean(rememberMe), typeof deviceId === 'string' ? deviceId : undefined);
  res.json(ApiResponse.success(result, result.message || 'Login verified successfully'));
};

export const resendLoginCode = async (req: Request, res: Response) => {
  const { email, username, identifier } = req.body;
  const loginIdentifier = (email || username || identifier || '').trim();
  const originBaseUrl = (req.headers.origin as string) || (req.headers.referer ? new URL(req.headers.referer as string).origin : '') || '';
  const result = await authService.resendLoginCode(loginIdentifier, originBaseUrl);
  res.json(ApiResponse.success(result, result.message || 'Code resent'));
};

export const getMe = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId || '';
  const user = await authService.getMe(userId);
  res.json(ApiResponse.success(user, 'User profile retrieved successfully'));
};

export const verifyEmail = async (req: Request, res: Response) => {
  const result = await authService.verifyEmail(req.params.token as string, req.query.email as string);
  res.json(ApiResponse.success(result, result.message || 'Email verified successfully'));
};

export const verifyCode = async (req: Request, res: Response) => {
  const { email, code } = req.body;
  const result = await authService.verifyCode(email, code);
  res.json(ApiResponse.success(result, result.message || 'Email verified successfully'));
};

export const forgotPassword = async (req: Request, res: Response) => {
  const originBaseUrl = (req.headers.origin as string) || (req.headers.referer ? new URL(req.headers.referer as string).origin : '') || '';
  const role = (req.body.role || req.query.role || '') as string;
  const result = await authService.forgotPassword(req.body.email, originBaseUrl, role);
  res.json(ApiResponse.success({ resetUrl: result.resetUrl, resetCode: result.resetCode, email: result.email }, result.message));
};

export const verifyResetCode = async (req: Request, res: Response) => {
  const { email, code } = req.body;
  const result = await authService.verifyResetCode(email, code);
  res.json(ApiResponse.success(result, result.message));
};

export const resetPassword = async (req: Request, res: Response) => {
  const newPass = req.body.password || req.body.newPassword;
  const token = (req.params.token || req.body.token || '') as string;
  const email = (req.body.email || '') as string;
  const code = (req.body.code || '') as string;

  const result = await authService.resetPassword({ token, email, code }, newPass);
  res.json(ApiResponse.success(null, result.message || 'Password reset successful'));
};

export const resendVerification = async (req: Request, res: Response) => {
  const originBaseUrl = (req.headers.origin as string) || (req.headers.referer ? new URL(req.headers.referer as string).origin : '') || '';
  const result = await authService.resendVerificationEmail(req.body.email, originBaseUrl);
  res.json(ApiResponse.success(result, result.message));
};

export const instantActivate = async (req: Request, res: Response) => {
  const result = await authService.instantActivate(req.body.email);
  res.json(ApiResponse.success(null, result.message));
};

export const getCodeHint = async (req: Request, res: Response) => {
  const email = (req.query.email as string) || (req.body.email as string) || '';
  const result = await authService.getCodeHint(email);
  res.json(ApiResponse.success(result, 'Code hint retrieved'));
};

export const getEmailLogsController = async (req: Request, res: Response) => {
  const email = (req.query.email as string) || '';
  const logs = getEmailLogs(email);
  res.json(ApiResponse.success(logs, 'Email logs retrieved'));
};

export const saveOAuthCredentials = async (req: Request, res: Response) => {
  const { provider, clientId, clientSecret, teamId, keyId, privateKey } = req.body;
  if (!provider || (provider !== 'google' && provider !== 'apple')) {
    throw new ApiError(400, 'Valid provider (google or apple) is required.');
  }

  oauthService.saveOAuthCredentials({
    provider,
    clientId,
    clientSecret,
    teamId,
    keyId,
    privateKey,
  });

  res.json(ApiResponse.success(null, `${provider === 'apple' ? 'Apple' : 'Google'} credentials saved successfully. Live authentication is now ready.`));
};
