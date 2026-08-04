import type { AuthTokens } from '../types/api.js';

const ACCESS_KEY = 'radar_access_token';
const REFRESH_KEY = 'radar_refresh_token';
const ACCESS_EXPIRES_KEY = 'radar_access_expires_at';
const REFRESH_EXPIRES_KEY = 'radar_refresh_expires_at';
const REMEMBER_KEY = 'radar_auth_remember';

const TOKEN_KEYS = [ACCESS_KEY, REFRESH_KEY, ACCESS_EXPIRES_KEY, REFRESH_EXPIRES_KEY] as const;

function clearStore(store: Storage): void {
  for (const key of TOKEN_KEYS) {
    store.removeItem(key);
  }
}

/** Preferência persistida: true = localStorage (continuar logado). */
export function isRememberMeEnabled(): boolean {
  if (sessionStorage.getItem(ACCESS_KEY)) return false;
  if (localStorage.getItem(ACCESS_KEY)) return true;
  return localStorage.getItem(REMEMBER_KEY) !== '0';
}

function resolveTokenStore(): Storage {
  if (localStorage.getItem(ACCESS_KEY)) return localStorage;
  if (sessionStorage.getItem(ACCESS_KEY)) return sessionStorage;
  return isRememberMeEnabled() ? localStorage : sessionStorage;
}

function readTokensFrom(store: Storage): AuthTokens | null {
  const accessToken = store.getItem(ACCESS_KEY);
  const refreshToken = store.getItem(REFRESH_KEY);
  if (!accessToken || !refreshToken) return null;

  const accessExpiresAt = Number(store.getItem(ACCESS_EXPIRES_KEY) ?? 0);
  const refreshExpiresAt = Number(store.getItem(REFRESH_EXPIRES_KEY) ?? 0);
  const now = Date.now();

  if (refreshExpiresAt > 0 && now >= refreshExpiresAt) {
    clearStore(store);
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

export function loadTokens(): AuthTokens | null {
  return readTokensFrom(localStorage) ?? readTokensFrom(sessionStorage);
}

export function saveTokens(
  tokens: AuthTokens,
  options: { rememberMe?: boolean } = {},
): void {
  const rememberMe = options.rememberMe ?? isRememberMeEnabled();
  const store = rememberMe ? localStorage : sessionStorage;

  clearTokens();
  localStorage.setItem(REMEMBER_KEY, rememberMe ? '1' : '0');

  const now = Date.now();
  store.setItem(ACCESS_KEY, tokens.accessToken);
  store.setItem(REFRESH_KEY, tokens.refreshToken);
  store.setItem(ACCESS_EXPIRES_KEY, String(now + tokens.expiresIn * 1000));
  store.setItem(REFRESH_EXPIRES_KEY, String(now + tokens.refreshExpiresIn * 1000));
}

export function clearTokens(): void {
  clearStore(localStorage);
  clearStore(sessionStorage);
}

export function getRefreshToken(): string | null {
  return resolveTokenStore().getItem(REFRESH_KEY);
}

export function getAccessToken(): string | null {
  return resolveTokenStore().getItem(ACCESS_KEY);
}

/** Intervalo recomendado para refresh proativo — 50 min (refresh token dura 1h). */
export const REFRESH_INTERVAL_MS = 50 * 60 * 1000;
