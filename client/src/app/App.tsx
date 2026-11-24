import React, { useState, useEffect } from 'react';
import { AppRouter } from './router';
import { AuthContext } from '../entities/user/context/AuthContext';
import { type User } from '../entities/user/types';
import { apiClient } from '../infrastructure/api/client';
import { ENDPOINTS } from '../infrastructure/api/endpoints';
import { useAuth } from '../entities/user/hooks/useAuth';
import { Toaster } from 'sonner';

const RoleAwareToaster = () => {
  const { user } = useAuth();
  const rawRole = (user?.role || '').toLowerCase();
  const isAdmin = rawRole === 'admin';
  const isFieldTeam =
    rawRole === 'fieldteam' ||
    rawRole === 'field_team' ||
    rawRole === 'field-team' ||
    rawRole === 'worker' ||
    rawRole === 'field' ||
    rawRole === 'crew' ||
    rawRole === 'technician';
  const roleName = isAdmin ? 'admin' : isFieldTeam ? 'fieldteam' : 'client';

  useEffect(() => {
    document.documentElement.setAttribute('data-user-role', roleName);
    document.body.setAttribute('data-user-role', roleName);
    document.documentElement.setAttribute('data-role', roleName);
    document.body.setAttribute('data-role', roleName);
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
  }, [roleName]);

  return (
    <Toaster
      richColors
      position="top-right"
      duration={2000}
      visibleToasts={3}
      toastOptions={{
        duration: 2000,
        className: `clearflow-role-toast role-${roleName}`,
      }}
      className={`clearflow-toaster role-${roleName}`}
      data-user-role={roleName}
      data-role={roleName}
    />
  );
};

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('clearflow_user');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed) {
        if (parsed.name === 'Sarah Jenkins') parsed.name = 'Abdullah';
        if (parsed.name === 'David Miller') parsed.name = 'Hassan';
        if (parsed.name === 'Marcus Vance') parsed.name = 'Ahsan';
        if (parsed.email?.toLowerCase().includes('wathraf') || parsed.email?.toLowerCase().includes('wathaf')) {
          parsed.role = 'FieldTeam';
        }
        localStorage.setItem('clearflow_user', JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('clearflow_token'));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem('clearflow_token'));
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const hasToken = !!localStorage.getItem('clearflow_token');
    const hasUser = !!localStorage.getItem('clearflow_user');
    return hasToken && !hasUser;
  });

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('clearflow_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiClient.get(ENDPOINTS.AUTH.ME);
        if (response.data?.success && response.data?.data) {
          setUser(response.data.data);
          setToken(storedToken);
          setIsAuthenticated(true);
          try {
            localStorage.setItem('clearflow_user', JSON.stringify(response.data.data));
          } catch {}
        } else {
          localStorage.removeItem('clearflow_token');
          localStorage.removeItem('clearflow_user');
          setUser(null);
          setToken(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.warn('Session background sync notice:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const handleUserUpdated = (e: any) => {
      const updated = e.detail;
      if (!updated) return;
      setUser((prev) => {
        if (!prev) return null;
        const curId = String(prev._id || (prev as any).id || '');
        const targetId = String(updated._id || updated.id || '');
        const curEmail = (prev.email || '').toLowerCase().trim();
        const targetEmail = (updated.email || '').toLowerCase().trim();
        if ((curId && curId === targetId) || (curEmail && targetEmail && curEmail === targetEmail)) {
          const merged = { ...prev, ...updated };
          try {
            localStorage.setItem('clearflow_user', JSON.stringify(merged));
          } catch {}
          return merged;
        }
        return prev;
      });
    };

    window.addEventListener('clearflow:user-updated', handleUserUpdated);
    return () => window.removeEventListener('clearflow:user-updated', handleUserUpdated);
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    setIsAuthenticated(true);
    setIsLoading(false);
    try {
      localStorage.setItem('clearflow_user', JSON.stringify(newUser));
    } catch {}
    localStorage.setItem('clearflow_token', newToken);
    localStorage.setItem('token', newToken);
  };

  const logout = () => {
    try {
      sessionStorage.setItem('clearflow_from_signout', 'true');
      localStorage.removeItem('clearflow_user');
      localStorage.removeItem('clearflow_token');
      localStorage.removeItem('token');
    } catch (e) {}
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...updates };
      setUser(updated);
      try {
        localStorage.setItem('clearflow_user', JSON.stringify(updated));
      } catch {}
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const App = () => {
  return (
    <AuthProvider>
      <RoleAwareToaster />
      <AppRouter />
    </AuthProvider>
  );
};

