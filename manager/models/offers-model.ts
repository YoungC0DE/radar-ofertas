import {
  getAffiliateLinkBacklogDelayMinutesFromDb,
  getAffiliateLinkBacklogThresholdFromDb,
  getAffiliateLinkDelayMsFromDb,
  getSearchLimit,
  hydrateQueueConfigCache,
} from '../../src/config/queue-config-store.js';
import {
  countOffers,
  findDeliveriesByOfferIds,
  findOfferById,
  findOffers,
  getOfferStats,
  type OfferSentFilter,
} from '../../src/offers/repository.js';
import type { DeliveryRecord, OfferRecord } from '../../src/offers/types.js';
import { estimatePendingSendTimes } from '../../src/queue/sender-schedule.js';
import { type DatabaseSnapshot, withDatabase } from './db-model.js';

const PAGE_SIZE = 50;

export interface AffiliateLinkDelaySettings {
  delayMs: number;
  backlogDelayMinutes: number;
  backlogThreshold: number;
}

export interface OffersPageData {
  database: DatabaseSnapshot;
  offers: OfferRecord[];
  scheduleByOfferId: Map<string, Date>;
  /** Entregas por oferta (destino/canais). Vazio se o canal não recebe a oferta. */
  deliveriesByOfferId: Map<string, DeliveryRecord[]>;
  filter: OfferSentFilter;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  pendingCount: number;
  searchLimit: number;
  affiliateDelay: AffiliateLinkDelaySettings;
}

export function parseSentFilter(value: string | null): OfferSentFilter {
  if (value === 'pending' || value === 'sent') return value;
  return 'all';
}

export function parsePage(value: string | null): number {
  const page = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export async function loadAffiliateLinkDelaySettings(): Promise<AffiliateLinkDelaySettings> {
  await hydrateQueueConfigCache();
  const [delayMs, backlogDelayMinutes, backlogThreshold] = await Promise.all([
    getAffiliateLinkDelayMsFromDb(),
    getAffiliateLinkBacklogDelayMinutesFromDb(),
    getAffiliateLinkBacklogThresholdFromDb(),
  ]);
  return { delayMs, backlogDelayMinutes, backlogThreshold };
}

export async function loadOffersPage(
  filter: OfferSentFilter,
  page: number,
): Promise<OffersPageData> {
  const result = await withDatabase(
    async () => {
      const total = await countOffers(filter);
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const safePage = Math.min(page, totalPages);
      const offset = (safePage - 1) * PAGE_SIZE;
      const offers = await findOffers({ sent: filter, limit: PAGE_SIZE, offset });
      const stats = await getOfferStats();
      return { offers, total, totalPages, page: safePage, pendingCount: stats.pending };
    },
    { offers: [] as OfferRecord[], total: 0, totalPages: 1, page: 1, pendingCount: 0 },
  );

  let scheduleByOfferId = new Map<string, Date>();
  let deliveriesByOfferId = new Map<string, DeliveryRecord[]>();
  const affiliateDelay = await loadAffiliateLinkDelaySettings();
  if (result.database.available) {
    if (result.data.pendingCount > 0) {
      scheduleByOfferId = await estimatePendingSendTimes();
    }
    deliveriesByOfferId = await findDeliveriesByOfferIds(result.data.offers.map((o) => o.id));
  }

  return {
    database: result.database,
    offers: result.data.offers,
    scheduleByOfferId,
    deliveriesByOfferId,
    filter,
    page: result.data.page,
    pageSize: PAGE_SIZE,
    total: result.data.total,
    totalPages: result.data.totalPages,
    pendingCount: result.data.pendingCount,
    searchLimit: getSearchLimit(),
    affiliateDelay,
  };
}

export async function loadOfferDetail(
  id: string,
): Promise<{ offer: OfferRecord | null; database: DatabaseSnapshot }> {
  const result = await withDatabase(async () => findOfferById(id), null);
  return { offer: result.data, database: result.database };
}
