import type { AuthTokens } from '../types/api.js';

const ACCESS_KEY = 'radar_access_token';
const REFRESH_KEY = 'radar_refresh_token';
const ACCESS_EXPIRES_KEY = 'radar_access_expires_at';
const REFRESH_EXPIRES_KEY = 'radar_refresh_expires_at';

export function loadTokens(): AuthTokens | null {
  const accessToken = localStorage.getItem(ACCESS_KEY);
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!accessToken || !refreshToken) return null;

  const accessExpiresAt = Number(localStorage.getItem(ACCESS_EXPIRES_KEY) ?? 0);
  const refreshExpiresAt = Number(localStorage.getItem(REFRESH_EXPIRES_KEY) ?? 0);
  const now = Date.now();

  if (refreshExpiresAt > 0 && now >= refreshExpiresAt) {
    clearTokens();
    return null;
  }

  const expiresIn =
    accessExpiresAt > now ? Math.max(1, Math.floor((accessExpiresAt - now) / 1000)) : 0;
  const refreshExpiresIn =
    refreshExpiresAt > now
      ? Math.max(1, Math.floor((refreshExpiresAt - now) / 1000))
      : 3600;

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn,
    refreshExpiresIn,
  };
}

export function saveTokens(tokens: AuthTokens): void {
  const now = Date.now();
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  localStorage.setItem(ACCESS_EXPIRES_KEY, String(now + tokens.expiresIn * 1000));
  localStorage.setItem(
    REFRESH_EXPIRES_KEY,
    String(now + tokens.refreshExpiresIn * 1000),
  );
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ACCESS_EXPIRES_KEY);
  localStorage.removeItem(REFRESH_EXPIRES_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

/** Intervalo recomendado para refresh proativo — 50 min (refresh token dura 1h). */
export const REFRESH_INTERVAL_MS = 50 * 60 * 1000;
