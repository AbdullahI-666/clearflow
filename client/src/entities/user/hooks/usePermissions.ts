import { useAuth } from './useAuth';
import { Role } from '../types';

export const usePermissions = () => {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase() || '';

  const isAdmin = role === 'admin';
  const isClient = role === 'client';
  const isFieldTeam = role === 'fieldteam' || role === 'field_team';

  const canAccess = (allowedRoles: (Role | string)[]) => {
    if (!user || !user.role) return false;
    const userRoleLower = user.role.toLowerCase();
    return allowedRoles.some((r) => {
      const rLower = r.toLowerCase();
      if (rLower === userRoleLower) return true;
      if (rLower === 'field_team' && userRoleLower === 'fieldteam') return true;
      if (rLower === 'fieldteam' && userRoleLower === 'field_team') return true;
      return false;
    });
  };

  return {
    isAdmin,
    isClient,
    isFieldTeam,
    canAccess,
  };
};

