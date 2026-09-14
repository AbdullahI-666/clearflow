import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.js';
import { ApiError } from '../utils/ApiError.js';

export const authorize = (...rolesOrArray: (string | string[])[]) => {
  const allowedRoles = rolesOrArray.flat();
  
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'Forbidden: You do not have the required permissions'));
    }
    next();
  };
};
