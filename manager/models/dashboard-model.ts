import { getRuntimeQueueConfigAsync } from '../../src/config/queue-config-store.js';
import { env } from '../../src/config/env.js';
import { validateCategoryConfig } from '../../src/mercado-livre/category-url.js';
import {
  findOffers,
  findLastSentAt,
  getOfferStats,
  type OfferStats,
} from '../../src/offers/repository.js';
import type { OfferRecord } from '../../src/offers/types.js';
import { estimatePendingSendTimes } from '../../src/queue/sender-schedule.js';
import { isWithinOperatingHours } from '../../src/utils/datetime.js';
import { type DatabaseSnapshot, withDatabase } from './db-model.js';
import { getQueuesSnapshot, type QueuesSnapshot } from './queue-model.js';
import { getMercadoLivreSessionStatus, getWhatsAppSessionStatus, type SessionStatus } from './session-model.js';

const emptyStats: OfferStats = { total: 0, pending: 0, sent: 0 };

export interface DashboardOfferRow {
  offer: OfferRecord;
  scheduleAt: Date | null;
  isPending: boolean;
}

export interface DashboardData {
  database: DatabaseSnapshot;
  stats: OfferStats;
  pendingOffers: DashboardOfferRow[];
  sentOffers: DashboardOfferRow[];
  queues: QueuesSnapshot;
  sessions: SessionStatus[];
  withinOperatingHours: boolean;
  timezone: string;
  operatingHours: { start: number; end: number };
  categories: ReturnType<typeof validateCategoryConfig>[];
  lastSentAt: Date | null;
  sendNowMessage?: string;
  sendNowError?: string;
}

export async function loadDashboardData(options: {
  sendNowMessage?: string;
  sendNowError?: string;
} = {}): Promise<DashboardData> {
  const queueConfig = await getRuntimeQueueConfigAsync();
  const operatingHours = {
    start: queueConfig.operatingHoursStart,
    end: queueConfig.operatingHoursEnd,
  };

  const offersResult = await withDatabase(
    async () => {
      const [stats, pendingOffers, sentOffers, lastSentAt] = await Promise.all([
        getOfferStats(),
        findOffers({ sent: 'pending', limit: 6 }),
        findOffers({ sent: 'sent', limit: 4 }),
        findLastSentAt(),
      ]);

      return { stats, pendingOffers, sentOffers, lastSentAt };
    },
    {
      stats: emptyStats,
      pendingOffers: [] as OfferRecord[],
      sentOffers: [] as OfferRecord[],
      lastSentAt: null as Date | null,
    },
  );

  let pendingRows: DashboardOfferRow[] = [];
  let sentRows: DashboardOfferRow[] = [];

  if (offersResult.database.available) {
    const schedule = await estimatePendingSendTimes(
      offersResult.data.pendingOffers.map((offer) => offer.id),
    );
    pendingRows = offersResult.data.pendingOffers.map((offer) => ({
      offer,
      scheduleAt: schedule.get(offer.id) ?? null,
      isPending: true,
    }));
    sentRows = offersResult.data.sentOffers.map((offer) => ({
      offer,
      scheduleAt: offer.sentAt,
      isPending: false,
    }));
  }

  const [queues, mlSession, waSession] = await Promise.all([
    getQueuesSnapshot(),
    getMercadoLivreSessionStatus(),
    getWhatsAppSessionStatus(),
  ]);

  const categories = env.ML_CATEGORIES.map((category) => validateCategoryConfig(category));

  return {
    database: offersResult.database,
    stats: offersResult.data.stats,
    pendingOffers: pendingRows,
    sentOffers: sentRows,
    queues,
    sessions: [mlSession, waSession],
    withinOperatingHours: isWithinOperatingHours(env.APP_TIMEZONE, {
      startHour: operatingHours.start,
      endHour: operatingHours.end,
    }),
    timezone: env.APP_TIMEZONE,
    operatingHours,
    categories,
    lastSentAt: offersResult.data.lastSentAt,
    sendNowMessage: options.sendNowMessage,
    sendNowError: options.sendNowError,
  };
}
