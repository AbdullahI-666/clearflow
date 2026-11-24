import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.js';
import { ApiError } from '../utils/ApiError.js';

export const authorize = (...rolesOrArray: (string | string[])[]) => {
  const allowedRoles = rolesOrArray.flat().map((r) => r.toLowerCase().trim());
  
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return next(new ApiError(401, 'Unauthorized: Please log in'));
    }
    const userRole = String(req.user.role).toLowerCase().trim();
    const isAllowed = allowedRoles.some((r) => {
      if (r === userRole) return true;
      if ((r === 'fieldteam' || r === 'worker') && (userRole === 'fieldteam' || userRole === 'worker')) return true;
      if (r === 'admin' && (userRole === 'admin' || userRole === 'superadmin')) return true;
      return false;
    });

    if (!isAllowed) {
      return next(new ApiError(403, 'Forbidden: You do not have the required permissions'));
    }
    next();
  };
};
