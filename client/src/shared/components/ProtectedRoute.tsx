import { useState, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { usePermissions } from '@/entities/user/hooks/usePermissions';
import { Role } from '@/entities/user/types';

import { ClearFlowPreloader } from '@/components/ui/clearflow-preloader';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { canAccess } = usePermissions();

  // On initial page load/refresh across any portal, run full 2.0s preloader with equal 1/3 theme times
  const wasLoadingOnMount = useRef(isLoading);
  const [preloaderDone, setPreloaderDone] = useState(!wasLoadingOnMount.current);

  if (wasLoadingOnMount.current && (!preloaderDone || isLoading)) {
    return (
      <ClearFlowPreloader
        minDuration={2000}
        onComplete={() => setPreloaderDone(true)}
      />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !canAccess(allowedRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
