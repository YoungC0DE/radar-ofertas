import { countOffers, findOfferById, findOffers, getOfferStats, type OfferSentFilter } from '../../src/offers/repository.js';
import type { OfferRecord } from '../../src/offers/types.js';
import { type DatabaseSnapshot, withDatabase } from './db-model.js';

const PAGE_SIZE = 50;

export interface OffersPageData {
  database: DatabaseSnapshot;
  offers: OfferRecord[];
  filter: OfferSentFilter;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  pendingCount: number;
}

export function parseSentFilter(value: string | null): OfferSentFilter {
  if (value === 'pending' || value === 'sent') return value;
  return 'all';
}

export function parsePage(value: string | null): number {
  const page = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export async function loadOffersPage(filter: OfferSentFilter, page: number): Promise<OffersPageData> {
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

  return {
    database: result.database,
    offers: result.data.offers,
    filter,
    page: result.data.page,
    pageSize: PAGE_SIZE,
    total: result.data.total,
    totalPages: result.data.totalPages,
    pendingCount: result.data.pendingCount,
  };
}

export async function loadOfferDetail(id: string): Promise<{ offer: OfferRecord | null; database: DatabaseSnapshot }> {
  const result = await withDatabase(
    async () => findOfferById(id),
    null,
  );
  return { offer: result.data, database: result.database };
}
