import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from './auth-storage.js';
import {
  ApiError,
  type ApiErrorBody,
  type AuthTokens,
  type AutoMessageBody,
  type AccountsResponse,
  type AccountPlatform,
  type CouponsRefreshResponse,
  type CouponsResponse,
  type DashboardResponse,
  type LogsQuery,
  type LogsResponse,
  type MercadoLivreConnectState,
  type OfferDetailResponse,
  type OfferDestinationFilter,
  type OfferOriginFilter,
  type OfferSentFilter,
  type OffersPageResponse,
  type PatchSourcesBody,
  type PublicUser,
  type PrismaState,
  type ScoreConfig,
  type SettingsResponse,
  type SourceChannel,
  type SourcesResponse,
  type TelegramVerifyState,
  type TemplateResponse,
  type WhatsAppConnectState,
  type WorkerState,
} from '../types/api.js';

const API_PREFIX = '/api/v1';

function resolveBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  return '';
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  auth?: boolean;
  retry?: boolean;
};

let refreshPromise: Promise<AuthTokens | null> | null = null;

async function parseError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (body.error && body.code) {
      return new ApiError(response.status, body);
    }
  } catch {
    /* resposta não JSON */
  }
  return new ApiError(response.status, {
    error: response.statusText || 'Erro na requisição',
    code: 'HTTP_ERROR',
  });
}

async function refreshTokens(): Promise<AuthTokens | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    return null;
  }

  const response = await fetch(`${resolveBaseUrl()}${API_PREFIX}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearTokens();
    return null;
  }

  const tokens = (await response.json()) as AuthTokens;
  saveTokens(tokens);
  return tokens;
}

async function ensureRefreshed(): Promise<AuthTokens | null> {
  if (!refreshPromise) {
    refreshPromise = refreshTokens().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, retry = true, headers, ...init } = options;

  const requestHeaders = new Headers(headers);
  if (body !== undefined) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (auth) {
    const token = getAccessToken();
    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(`${resolveBaseUrl()}${API_PREFIX}${path}`, {
    ...init,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && auth && retry) {
    const tokens = await ensureRefreshed();
    if (tokens) {
      return apiRequest<T>(path, { ...options, retry: false });
    }
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  return (await response.json()) as T;
}

export const api = {
  login: (username: string, password: string) =>
    apiRequest<AuthTokens>('/auth/login', {
      method: 'POST',
      body: { username, password },
      auth: false,
    }),

  logout: () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      void apiRequest<void>('/auth/logout', {
        method: 'POST',
        body: { refreshToken },
        auth: false,
      }).catch(() => undefined);
    }
    clearTokens();
  },

  refresh: () => refreshTokens(),

  me: () => apiRequest<{ user: PublicUser }>('/auth/me'),

  dashboard: () => apiRequest<DashboardResponse>('/dashboard'),

  collectOffers: (body?: {
    productName?: string;
    searchLimit?: number;
    sendAfterCollect?: boolean;
    sendDelayMinutes?: number;
  }) =>
    apiRequest<{
      queued: true;
      searchLimit: number;
      productName: string | null;
      sendAfterCollect: boolean;
      sendDelayMinutes: number | null;
    }>('/offers/collect', {
      method: 'POST',
      body: body ?? {},
    }),

  listOffers: (
    params: {
      status?: OfferSentFilter;
      origin?: OfferOriginFilter;
      destination?: OfferDestinationFilter;
      page?: number;
    } = {},
  ) => {
    const search = new URLSearchParams();
    if (params.status && params.status !== 'all') search.set('status', params.status);
    if (params.origin && params.origin !== 'all') search.set('origin', params.origin);
    if (params.destination && params.destination !== 'all') {
      search.set('destination', params.destination);
    }
    if (params.page && params.page > 1) search.set('page', String(params.page));
    const query = search.toString();
    return apiRequest<OffersPageResponse>(`/offers${query ? `?${query}` : ''}`);
  },

  getOffer: (id: string) => apiRequest<OfferDetailResponse>(`/offers/${encodeURIComponent(id)}`),

  patchSearchLimit: (searchLimit: number) =>
    apiRequest<{ searchLimit: number }>('/offers/settings/search-limit', {
      method: 'PATCH',
      body: { searchLimit },
    }),

  patchAffiliateDelay: (body: {
    affiliateDelayMs: number;
    affiliateBacklogDelayMinutes: number;
    affiliateBacklogThreshold: number;
  }) =>
    apiRequest<typeof body>('/offers/settings/affiliate-delay', {
      method: 'PATCH',
      body,
    }),

  sendOfferNow: (id: string) =>
    apiRequest<{ ok: true; offerId: string }>(`/offers/${encodeURIComponent(id)}/send-now`, {
      method: 'POST',
    }),

  deleteOffer: (id: string) =>
    apiRequest<void>(`/offers/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  deletePendingOffers: () =>
    apiRequest<{ deleted: number }>('/offers/pending', { method: 'DELETE' }),

  getTemplate: () => apiRequest<TemplateResponse>('/template'),

  patchOfferTemplate: (body: { template: string; placeholderVisibility: Record<string, boolean> }) =>
    apiRequest<TemplateResponse>('/template/offer', { method: 'PATCH', body }),

  patchCouponTemplate: (body: { template: string; placeholderVisibility: Record<string, boolean> }) =>
    apiRequest<TemplateResponse>('/template/coupon', { method: 'PATCH', body }),

  createAutoMessage: (body: AutoMessageBody) =>
    apiRequest<TemplateResponse>('/auto-messages', { method: 'POST', body }),

  updateAutoMessage: (id: string, body: AutoMessageBody) =>
    apiRequest<TemplateResponse>(`/auto-messages/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body,
    }),

  deleteAutoMessage: (id: string) =>
    apiRequest<void>(`/auto-messages/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  sendAutoMessage: (id: string) =>
    apiRequest<{ ok: true; autoMessageId: string }>(
      `/auto-messages/${encodeURIComponent(id)}/send`,
      { method: 'POST' },
    ),

  getSettings: () => apiRequest<SettingsResponse>('/settings'),

  patchScoreSettings: (body: ScoreConfig) =>
    apiRequest<SettingsResponse>('/settings/score', { method: 'PATCH', body }),

  patchBrandSettings: (body: {
    name: string;
    subtitle: string;
    logoData?: string;
    removeLogo?: boolean;
  }) => apiRequest<SettingsResponse>('/settings/brand', { method: 'PATCH', body }),

  patchOperatingHours: (body: { startHour: number; endHour: number }) =>
    apiRequest<SettingsResponse>('/settings/operating-hours', { method: 'PATCH', body }),

  patchSendInterval: (body: { intervalMinutes: number }) =>
    apiRequest<SettingsResponse>('/settings/send-interval', { method: 'PATCH', body }),

  patchSenderDelay: (body: { senderDelayMinutes: number }) =>
    apiRequest<SettingsResponse>('/settings/sender-delay', { method: 'PATCH', body }),

  patchCouponsUrl: (body: { couponsUrl: string }) =>
    apiRequest<SettingsResponse>('/settings/coupons-url', { method: 'PATCH', body }),

  patchAmazonAffiliate: (body: {
    baseUrl: string;
    affiliateLinkPrefix: string;
    storeId: string;
  }) => apiRequest<SettingsResponse>('/settings/amazon-affiliate', { method: 'PATCH', body }),

  patchAmazonCollection: (body: { enabled: boolean }) =>
    apiRequest<SettingsResponse>('/settings/amazon-collection', { method: 'PATCH', body }),

  getWorkerStatus: (params: { channel?: string; accountId?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.channel) search.set('channel', params.channel);
    if (params.accountId) search.set('accountId', params.accountId);
    const query = search.toString();
    return apiRequest<WorkerState>(`/worker/status${query ? `?${query}` : ''}`);
  },

  startWorker: (params: { channel?: string; accountId?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.channel) search.set('channel', params.channel);
    if (params.accountId) search.set('accountId', params.accountId);
    const query = search.toString();
    return apiRequest<WorkerState>(`/worker/start${query ? `?${query}` : ''}`, { method: 'POST' });
  },

  stopWorker: (params: { channel?: string; accountId?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.channel) search.set('channel', params.channel);
    if (params.accountId) search.set('accountId', params.accountId);
    const query = search.toString();
    return apiRequest<WorkerState>(`/worker/stop${query ? `?${query}` : ''}`, { method: 'POST' });
  },

  restartWorker: (params: { channel?: string; accountId?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.channel) search.set('channel', params.channel);
    if (params.accountId) search.set('accountId', params.accountId);
    const query = search.toString();
    return apiRequest<WorkerState>(`/worker/restart${query ? `?${query}` : ''}`, { method: 'POST' });
  },

  getPrismaStatus: () => apiRequest<PrismaState>('/prisma/status'),

  runPrismaGenerate: () => apiRequest<PrismaState>('/prisma/generate', { method: 'POST' }),

  getLogs: (params: LogsQuery = {}) => {
    const search = new URLSearchParams();
    search.set('level', params.level ?? 'all');
    search.set('source', params.source ?? 'all');
    search.set('limit', String(params.limit ?? 200));
    if (params.since) search.set('since', params.since);
    if (params.mlSince) search.set('mlSince', params.mlSince);
    const query = search.toString();
    return apiRequest<LogsResponse>(`/logs${query ? `?${query}` : ''}`);
  },

  getCoupons: () => apiRequest<CouponsResponse>('/coupons'),

  refreshCoupons: () =>
    apiRequest<CouponsRefreshResponse>('/coupons/refresh', { method: 'POST' }),

  sendCoupon: (id: string, body: { code?: string } = {}) =>
    apiRequest<{ ok: true; message: string }>(`/coupons/${encodeURIComponent(id)}/send`, {
      method: 'POST',
      body,
    }),

  patchCouponStoreLink: (id: string, body: { storeUrl: string; code?: string }) =>
    apiRequest<{ ok: true }>(`/coupons/${encodeURIComponent(id)}/store-link`, {
      method: 'PATCH',
      body,
    }),

  getSources: (channel: SourceChannel) =>
    apiRequest<SourcesResponse>(`/sources/${channel}`),

  patchSources: (channel: SourceChannel, body: PatchSourcesBody) =>
    apiRequest<SourcesResponse>(`/sources/${channel}`, { method: 'PATCH', body }),

  addMlSource: (channel: SourceChannel, body: { url: string; label?: string }) =>
    apiRequest<SourcesResponse>(`/sources/${channel}/ml`, { method: 'POST', body }),

  addAmazonSource: (channel: SourceChannel, body: { url: string; label?: string }) =>
    apiRequest<SourcesResponse>(`/sources/${channel}/amazon`, { method: 'POST', body }),

  deleteMlSource: (channel: SourceChannel, sourceId: string) =>
    apiRequest<SourcesResponse>(
      `/sources/${channel}/ml/${encodeURIComponent(sourceId)}`,
      { method: 'DELETE' },
    ),

  deleteAmazonSource: (channel: SourceChannel, sourceId: string) =>
    apiRequest<SourcesResponse>(
      `/sources/${channel}/amazon/${encodeURIComponent(sourceId)}`,
      { method: 'DELETE' },
    ),

  getAccounts: () => apiRequest<AccountsResponse>('/accounts'),

  createAccount: (body: { platform: AccountPlatform; label: string }) =>
    apiRequest<AccountsResponse>('/accounts', { method: 'POST', body }),

  toggleAccount: (accountId: string, platform: AccountPlatform) =>
    apiRequest<AccountsResponse>(
      `/accounts/${encodeURIComponent(accountId)}/${platform}/toggle`,
      { method: 'PATCH' },
    ),

  deleteAccount: (accountId: string, platform: AccountPlatform) =>
    apiRequest<void>(
      `/accounts/${encodeURIComponent(accountId)}/${platform}`,
      { method: 'DELETE' },
    ),

  patchWhatsAppChannel: (accountId: string, body: { inviteLink: string }) =>
    apiRequest<AccountsResponse>(
      `/accounts/${encodeURIComponent(accountId)}/whatsapp-channel`,
      { method: 'PATCH', body },
    ),

  addWhatsAppDestination: (accountId: string, body: { inviteInput: string }) =>
    apiRequest<AccountsResponse>(
      `/accounts/${encodeURIComponent(accountId)}/whatsapp-destinations`,
      { method: 'POST', body },
    ),

  removeWhatsAppDestination: (accountId: string, body: { destinationId: string }) =>
    apiRequest<AccountsResponse>(
      `/accounts/${encodeURIComponent(accountId)}/whatsapp-destinations`,
      { method: 'DELETE', body },
    ),

  toggleWhatsAppDestination: (
    accountId: string,
    body: { destinationId: string; enabled: boolean },
  ) =>
    apiRequest<AccountsResponse>(
      `/accounts/${encodeURIComponent(accountId)}/whatsapp-destinations/toggle`,
      { method: 'PATCH', body },
    ),

  patchTelegramConfig: (
    accountId: string,
    body: { enabled: boolean; botToken: string; chatId: string },
  ) =>
    apiRequest<AccountsResponse>(`/accounts/${encodeURIComponent(accountId)}/telegram`, {
      method: 'PATCH',
      body,
    }),

  patchMercadoLivreConfig: (accountId: string, body: { affiliateTag: string }) =>
    apiRequest<AccountsResponse>(
      `/accounts/${encodeURIComponent(accountId)}/mercado-livre`,
      { method: 'PATCH', body },
    ),

  startWhatsAppConnect: (accountId: string) =>
    apiRequest<WhatsAppConnectState>(
      `/accounts/${encodeURIComponent(accountId)}/connect/whatsapp/start`,
      { method: 'POST' },
    ),

  getWhatsAppConnectStatus: (accountId: string) =>
    apiRequest<WhatsAppConnectState>(
      `/accounts/${encodeURIComponent(accountId)}/connect/whatsapp/status`,
    ),

  startMercadoLivreConnect: (accountId: string) =>
    apiRequest<MercadoLivreConnectState>(
      `/accounts/${encodeURIComponent(accountId)}/connect/mercado-livre/start`,
      { method: 'POST' },
    ),

  getMercadoLivreConnectStatus: (accountId: string) =>
    apiRequest<MercadoLivreConnectState>(
      `/accounts/${encodeURIComponent(accountId)}/connect/mercado-livre/status`,
    ),

  finishMercadoLivreConnect: (accountId: string) =>
    apiRequest<MercadoLivreConnectState>(
      `/accounts/${encodeURIComponent(accountId)}/connect/mercado-livre/finish`,
      { method: 'POST' },
    ),

  cancelMercadoLivreConnect: (accountId: string) =>
    apiRequest<MercadoLivreConnectState>(
      `/accounts/${encodeURIComponent(accountId)}/connect/mercado-livre/cancel`,
      { method: 'POST' },
    ),

  verifyTelegramConnect: (accountId: string) =>
    apiRequest<TelegramVerifyState>(
      `/accounts/${encodeURIComponent(accountId)}/connect/telegram/verify`,
    ),
};

export { refreshTokens };
