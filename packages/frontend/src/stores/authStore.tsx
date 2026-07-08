import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../lib/api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  locale: 'ar' | 'en';
  status: string;
  mfaEnabled: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  locale: 'ar' | 'en';
  direction: 'rtl' | 'ltr';
  settings: {
    dateFormat: string;
    currency: string;
    timezone: string;
    theme: {
      primaryColor: string;
      logo?: string;
      brandName: string;
    };
  };
}

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, tenantSlug: string) => Promise<void>;
  register: (data: { name: string; slug: string; adminEmail: string; adminPassword: string; adminName: string; locale?: string }) => Promise<void>;
  logout: () => void;
  setLocale: (locale: 'ar' | 'en') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('accessToken'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (localStorage.getItem('accessToken')) {
      authApi.me()
        .then((data) => {
          setUser(data.user);
          setTenant(data.tenant);
          setIsAuthenticated(true);
          localStorage.setItem('locale', data.user.locale);
        })
        .catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setIsAuthenticated(false);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string, tenantSlug: string) => {
    const data = await authApi.login({ email, password, tenantSlug });
    localStorage.setItem('accessToken', data.tokens.accessToken);
    localStorage.setItem('refreshToken', data.tokens.refreshToken);
    localStorage.setItem('tenantSlug', data.tenant.slug);
    localStorage.setItem('locale', data.user.locale);
    setUser(data.user);
    setTenant(data.tenant);
    setIsAuthenticated(true);
  }, []);

  const register = useCallback(async (data: { name: string; slug: string; adminEmail: string; adminPassword: string; adminName: string; locale?: string }) => {
    await authApi.register(data);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tenantSlug');
    setUser(null);
    setTenant(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  }, []);

  const setLocale = useCallback((locale: 'ar' | 'en') => {
    localStorage.setItem('locale', locale);
    setUser((prev) => prev ? { ...prev, locale } : null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, tenant, isAuthenticated, isLoading, login, register, logout, setLocale }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
