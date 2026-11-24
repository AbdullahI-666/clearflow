import { useAuth } from './useAuth';
import { Role } from '../types';

export const usePermissions = () => {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase() || '';

  const isAdmin = role === 'admin';
  const isFieldTeam =
    role === 'fieldteam' ||
    role === 'field_team' ||
    role === 'field-team' ||
    role === 'worker' ||
    role === 'field' ||
    role === 'crew' ||
    role === 'technician';
  const isClient = !isAdmin && !isFieldTeam;

  const canAccess = (allowedRoles: (Role | string)[]) => {
    if (!user || !user.role) return false;
    const userRoleLower = user.role.toLowerCase();
    const userIsField =
      userRoleLower === 'fieldteam' ||
      userRoleLower === 'field_team' ||
      userRoleLower === 'field-team' ||
      userRoleLower === 'worker' ||
      userRoleLower === 'field' ||
      userRoleLower === 'crew' ||
      userRoleLower === 'technician';

    return allowedRoles.some((r) => {
      const rLower = r.toLowerCase();
      if (rLower === userRoleLower) return true;
      if (
        (rLower === 'fieldteam' || rLower === 'field_team' || rLower === 'field-team' || rLower === 'worker') &&
        userIsField
      ) {
        return true;
      }
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

