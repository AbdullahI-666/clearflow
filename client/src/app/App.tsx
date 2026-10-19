import React, { useState, useEffect } from 'react';
import { AppRouter } from './router';
import { AuthContext } from '../entities/user/context/AuthContext';
import { type User } from '../entities/user/types';
import { apiClient } from '../infrastructure/api/client';
import { ENDPOINTS } from '../infrastructure/api/endpoints';
import { Toaster } from 'sonner';

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('clearflow_token'));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
        } else {
          localStorage.removeItem('clearflow_token');
          setUser(null);
          setToken(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.warn('Session restoration failed:', err);
        localStorage.removeItem('clearflow_token');
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    setIsAuthenticated(true);
    localStorage.setItem('clearflow_token', newToken);
    localStorage.setItem('token', newToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('clearflow_token');
    localStorage.removeItem('token');
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
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
      <Toaster richColors position="top-right" />
      <AppRouter />
    </AuthProvider>
  );
};

