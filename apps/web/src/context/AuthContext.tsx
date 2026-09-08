import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, type AuthSessionResponse, type AuthUser } from '../api/auth';
import { isApiClientError } from '../api/client';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (input: { email: string; password: string }) => Promise<AuthSessionResponse>;
  register: (input: { email: string; password: string; firstName: string; lastName: string }) => Promise<AuthSessionResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const current = await authApi.me();
      setUser(current);
      setError(null);
      return current;
    } catch (authError) {
      if (isApiClientError(authError) && authError.status === 401) {
        try {
          const refreshed = await authApi.refresh();
          setUser(refreshed.user);
          setError(null);
          return refreshed.user;
        } catch (refreshError) {
          if (!isApiClientError(refreshError) || refreshError.status !== 401) {
            setError(refreshError instanceof Error ? refreshError.message : 'Session refresh failed.');
          }
          setUser(null);
          return null;
        }
      }
      setUser(null);
      setError(authError instanceof Error ? authError.message : 'Unable to load your session.');
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void refreshUser().finally(() => {
      if (mounted) setIsLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [refreshUser]);

  const login = useCallback(async (input: { email: string; password: string }) => {
    setError(null);
    const result = await authApi.login(input);
    setUser(result.user);
    return result;
  }, []);

  const register = useCallback(async (input: { email: string; password: string; firstName: string; lastName: string }) => {
    setError(null);
    return authApi.register(input);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, isAuthenticated: Boolean(user), error, login, register, logout, refreshUser }),
    [user, isLoading, error, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}

