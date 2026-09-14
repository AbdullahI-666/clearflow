import { Request, Response, NextFunction } from 'express';
import { jwtVerify, SignJWT } from 'jose';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

const secret = new TextEncoder().encode(env.JWT_SECRET);

export const generateToken = async (userId: string, role: string): Promise<string> => {
  const jwt = await new SignJWT({ userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secret);
  return jwt;
};

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    // Allow token in query parameter for direct PDF downloads and binary streaming
    if (!token && req.query.token) {
      token = String(req.query.token);
    }

    if (!token) {
      throw new ApiError(401, 'Unauthorized: No token provided');
    }
    
    try {
      const { payload } = await jwtVerify(token, secret);
      req.user = {
        userId: payload.userId as string,
        role: payload.role as string,
      };
      next();
    } catch (err) {
      throw new ApiError(401, 'Unauthorized: Invalid or expired token');
    }
  } catch (error) {
    next(error);
  }
};
