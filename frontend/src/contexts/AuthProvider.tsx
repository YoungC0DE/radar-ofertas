import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { AuthContext, type AuthContextValue } from './auth-context.js';
import { api, refreshTokens } from '../services/api.js';
import {
  REFRESH_INTERVAL_MS,
  clearTokens,
  loadTokens,
  saveTokens,
} from '../services/auth-storage.js';
import type { PublicUser } from '../types/api.js';

async function fetchCurrentUser(): Promise<PublicUser | null> {
  try {
    const response = await api.me();
    return response.user;
  } catch {
    return null;
  }
}

type AuthProviderProps = {
  readonly children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<number | null>(null);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
    if (refreshTimerRef.current !== null) {
      window.clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      window.clearInterval(refreshTimerRef.current);
    }

    refreshTimerRef.current = window.setInterval(() => {
      void refreshTokens().then((tokens) => {
        if (!tokens) logout();
      });
    }, REFRESH_INTERVAL_MS);
  }, [logout]);

  const login = useCallback(
    async (username: string, password: string, options: { rememberMe?: boolean } = {}) => {
      const tokens = await api.login(username, password);
      saveTokens(tokens, { rememberMe: options.rememberMe !== false });
      const currentUser = await fetchCurrentUser();
      if (!currentUser) {
        clearTokens();
        throw new Error('Falha ao carregar usuário após login');
      }
      setUser(currentUser);
      scheduleRefresh();
    },
    [scheduleRefresh],
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const tokens = loadTokens();
      if (!tokens) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      const currentUser = await fetchCurrentUser();
      if (cancelled) return;

      if (!currentUser) {
        const refreshed = await refreshTokens();
        if (refreshed) {
          const retryUser = await fetchCurrentUser();
          if (retryUser) {
            setUser(retryUser);
            scheduleRefresh();
            setIsLoading(false);
            return;
          }
        }
        clearTokens();
        setIsLoading(false);
        return;
      }

      setUser(currentUser);
      scheduleRefresh();
      setIsLoading(false);
    }

    void bootstrap();

    return () => {
      cancelled = true;
      if (refreshTimerRef.current !== null) {
        window.clearInterval(refreshTimerRef.current);
      }
    };
  }, [scheduleRefresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      logout,
    }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
