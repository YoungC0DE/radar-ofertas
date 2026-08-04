export type ApiErrorBody = {
  error: string;
  code: string;
  details?: unknown;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshExpiresIn: number;
};

export type PublicUser = {
  id: string;
  username: string;
  createdAt: string;
  updatedAt: string;
};

export type LoginResponse = AuthTokens;

export type MeResponse = {
  user: PublicUser;
};

export type OfferStats = {
  total: number;
  pending: number;
  sent: number;
};

export type DashboardResponse = {
  stats: OfferStats;
  withinOperatingHours: boolean;
  timezone: string;
  operatingHours: { start: number; end: number };
  sessions: Array<{ label: string; ok: boolean; detail: string }>;
  queues: unknown;
  pendingOffers: unknown[];
  sentOffers: unknown[];
};

export type OfferSentFilter = 'all' | 'pending' | 'sent' | 'error';
export type OfferOriginFilter = 'all' | 'mercado_livre' | 'amazon';
export type OfferDestinationFilter = 'all' | 'whatsapp' | 'telegram';

export type Channel = 'whatsapp' | 'telegram';

export type SerializedOffer = {
  id: string;
  mercadoLivreId: string;
  title: string;
  price: number;
  oldPrice: number | null;
  discount: number | null;
  image: string | null;
  permalink: string | null;
  affiliateLink: string | null;
  rating: number | null;
  soldQuantity: number | null;
  salesRank: string | null;
  seller: string | null;
  officialStore: boolean;
  bestSeller: boolean;
  score: number;
  sentAt: string | null;
  createdAt: string;
};

export type SerializedDelivery = {
  id: string;
  offerId: string;
  channel: Channel;
  accountId: string;
  sentAt: string | null;
  messageId: string | null;
  error: string | null;
  createdAt: string;
};

export type DatabaseSnapshot = {
  available: boolean;
  error?: string;
};

export type AffiliateDelaySettings = {
  delayMs: number;
  backlogDelayMinutes: number;
  backlogThreshold: number;
};

export type OffersPageResponse = {
  database: DatabaseSnapshot;
  offers: SerializedOffer[];
  scheduleByOfferId: Record<string, string>;
  deliveriesByOfferId: Record<string, SerializedDelivery[]>;
  filter: OfferSentFilter;
  origin: OfferOriginFilter;
  destination: OfferDestinationFilter;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  pendingCount: number;
  searchLimit: number;
  affiliateDelay: AffiliateDelaySettings;
};

export type OfferDetailResponse = {
  offer: SerializedOffer;
  messagePreview: string;
  coupon: string | null;
};

export type AutoMessageScheduleType = 'manual' | 'once' | 'daily';

export type SerializedAutoMessage = {
  id: string;
  title: string;
  content: string;
  scheduleType: AutoMessageScheduleType;
  scheduledAt: string | null;
  dailyHour: number | null;
  dailyMinute: number | null;
  enabled: boolean;
  lastSentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TemplateSectionData = {
  template: string;
  defaultTemplate: string;
  placeholderVisibility: Record<string, boolean>;
  previewText: string;
  previewValues: Record<string, string>;
};

export type TemplateResponse = {
  database: DatabaseSnapshot;
  offerTemplate: TemplateSectionData & {
    previewOffer: SerializedOffer | null;
  };
  couponTemplate: TemplateSectionData;
  autoMessages: SerializedAutoMessage[];
  autoMessagePlaceholders: Array<{ key: string; label: string; example: string }>;
};

export type AutoMessageBody = {
  title: string;
  content: string;
  scheduleType: AutoMessageScheduleType;
  scheduledAt?: string;
  dailyTime?: string;
  enabled: boolean;
};

export type ScoreTier = {
  enabled: boolean;
  threshold: number;
  points: number;
};

export type ScoreCategory = {
  enabled: boolean;
  cumulative: boolean;
  tiers: ScoreTier[];
};

export type ScoreConfig = {
  minScore: number;
  discount: ScoreCategory;
  rating: ScoreCategory;
  soldQuantity: ScoreCategory;
  price: ScoreCategory;
};

export type SessionStatus = {
  ok: boolean;
  detail: string;
};

export type WorkerStatus = 'stopped' | 'starting' | 'running' | 'error';

export type WorkerState = {
  status: WorkerStatus;
  startedAt: string | null;
  detail: string | null;
};

export type PrismaStatus = 'idle' | 'running' | 'done' | 'error';

export type PrismaState = {
  status: PrismaStatus;
  output: string;
  error: string | null;
};

export type SettingsResponse = {
  timezone: string;
  operatingHours: { start: number; end: number };
  operatingHoursLabel: string;
  withinOperatingHours: boolean;
  minScore: number;
  scoreConfig: ScoreConfig;
  scoreRulesSummary: string[];
  collectorIntervalMinutes: number;
  senderDelayMinutes: number;
  brand: {
    name: string;
    subtitle: string;
    logoHref: string | null;
    initial: string;
  };
  sessions: {
    mercadoLivre: SessionStatus;
    whatsapp: SessionStatus;
    telegram: SessionStatus | null;
  };
  telegram: {
    enabled: boolean;
    chatId: string;
    hasBotToken: boolean;
  };
  worker: {
    state: WorkerState;
    sender: {
      accountId: string;
      label: string;
      prefix: string;
      state: WorkerState;
    };
    canSpawnWorkers: boolean;
  };
  /** Porta noVNC para abrir o desktop do login ML (null = desabilitado). */
  novncPort: number | null;
  mlCouponsUrl: string;
  amazonAffiliate: {
    baseUrl: string;
    affiliateLinkPrefix: string;
    storeId: string;
  };
  amazonCollectionEnabled: boolean;
};

export type ClassifiedLogEntry = {
  timestamp: string;
  level: string;
  source: string;
  message: string;
  meta: Record<string, unknown>;
  module: string;
  action: string;
  metaTrail: string;
  chip: string;
  chipClass: string;
  searchBlob: string;
};

export type ClassifiedMlScrapeEntry = {
  timestamp: string;
  level: string;
  message: string;
  meta: Record<string, unknown>;
  detail: string;
  status: string;
  statusClass: string;
  method: string;
};

export type LogsQuery = {
  level?: 'all' | 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  source?: 'all' | 'collector' | 'worker' | 'api' | 'manager';
  limit?: number;
  since?: string;
  mlSince?: string;
};

export type LogsResponse = {
  logs: ClassifiedLogEntry[];
  total: number;
  mlScrapeCount: number;
  mlScrapeLogs: ClassifiedMlScrapeEntry[];
  redisEnabled?: boolean;
};

export type LogsStreamReadyEvent = {
  redisEnabled: boolean;
};

export type LogsStreamLogEvent =
  | { type: 'audit'; entry: ClassifiedLogEntry }
  | { type: 'mlScrape'; entry: ClassifiedMlScrapeEntry };

export type MlCoupon = {
  id: string;
  title: string;
  description: string;
  discountLabel: string;
  code: string | null;
  category: string | null;
  minPurchase: string | null;
  expiresAt: string | null;
  storeName: string | null;
  storeUrl: string | null;
  sellerId: string | null;
  status: 'available' | 'generated' | 'expired' | 'unknown';
  rawStatus: string | null;
};

export type CouponsResponse = {
  coupons: MlCoupon[];
  couponsUrl: string;
  scrapedAt: string | null;
  source: 'http' | 'browser' | null;
};

export type CouponsRefreshResponse = CouponsResponse & {
  count: number;
};

export type SourceChannel = 'whatsapp' | 'telegram';

export type SourceListingKind = 'offers' | 'browse_node' | 'search' | 'product' | string;

export type MlSourceRow = {
  id: string;
  label: string;
  category: string;
  channels: SourceChannel[];
  fromEnv: boolean;
  valid: boolean;
  type: string;
  listingKind: SourceListingKind;
  reason?: string;
};

export type AmazonSourceRow = {
  id: string;
  label: string;
  source: string;
  channels: SourceChannel[];
  fromEnv: boolean;
  valid: boolean;
  kind: SourceListingKind;
  reason?: string;
};

export type SourcesResponse = {
  channel: SourceChannel;
  channelLabel: string;
  channels: Array<{ channel: SourceChannel; label: string; active: boolean }>;
  mlRows: MlSourceRow[];
  amazonRows: AmazonSourceRow[];
  activeCount: number;
};

export type PatchSourcesBody = {
  ml?: {
    env?: Array<{ index: number; enabled: boolean }>;
    custom?: Array<{ id: string; enabled: boolean }>;
  };
  amazon?: {
    env?: Array<{ index: number; enabled: boolean }>;
    custom?: Array<{ id: string; enabled: boolean }>;
  };
};

export type AccountPlatform = 'whatsapp' | 'telegram' | 'mercado_livre';

export type WhatsAppDestinationView = {
  id: string;
  jid: string;
  kind: 'newsletter' | 'group';
  label: string | null;
  inviteLink: string | null;
  enabled: boolean;
  kindLabel: string;
};

export type AccountCard = {
  account: {
    id: string;
    platform: AccountPlatform;
    label: string;
    enabled: boolean;
    config: Record<string, unknown>;
  };
  whatsapp?: {
    destinations: WhatsAppDestinationView[];
    channelId: string;
    channelName: string | null;
    channelInviteLink: string;
    channelConfigured: boolean;
  };
  telegram?: {
    chatId: string;
    hasBotToken: boolean;
  };
  mercadoLivre?: {
    sessionOk: boolean;
    sessionDetail: string;
    affiliateTag: string;
    affiliateTagFromEnv: boolean;
  };
  connection?: {
    loggedIn: boolean;
    detail: string;
  };
};

export type AccountsResponse = {
  integrations: AccountCard[];
  marketplaces: AccountCard[];
  integrationPlatforms: Array<{ id: AccountPlatform; label: string }>;
  marketplacePlatforms: Array<{ id: AccountPlatform; label: string }>;
  canSpawnWorkers: boolean;
  /** Porta noVNC para abrir o desktop do login ML (null = desabilitado). */
  novncPort: number | null;
};

export type WhatsAppConnectState = {
  status: 'idle' | 'connecting' | 'qr' | 'connected' | 'error';
  qr: string | null;
  error: string | null;
};

export type MercadoLivreConnectState = {
  status: 'idle' | 'opening' | 'awaiting-login' | 'saving' | 'connected' | 'error';
  error: string | null;
  /** Porta do noVNC no host quando `MANAGER_VNC_ENABLED`; o painel monta a URL com o hostname atual. */
  novncPort: number | null;
};

export type TelegramVerifyState = {
  ok: boolean;
  detail: string;
};
