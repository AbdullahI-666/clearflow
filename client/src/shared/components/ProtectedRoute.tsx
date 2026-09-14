import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { usePermissions } from '@/entities/user/hooks/usePermissions';
import { Role } from '@/entities/user/types';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { canAccess } = usePermissions();

  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center text-primary font-medium">Loading ClearFlow...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !canAccess(allowedRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
