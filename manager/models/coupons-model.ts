import { env } from '../../src/config/env.js';
import { scrapeAffiliateCoupons } from '../../src/mercado-livre/coupons.js';
import type { CouponScrapeResult, MlCoupon } from '../../src/mercado-livre/types.js';
import { getMercadoLivreSessionStatus } from './session-model.js';

export interface CouponsPageData {
  coupons: MlCoupon[];
  couponsUrl: string;
  scrapedAt: string | null;
  source: CouponScrapeResult['source'] | null;
  sessionOk: boolean;
  sessionDetail: string;
  refreshed: boolean;
  error: string | null;
}

let lastScrape: CouponScrapeResult | null = null;

export async function loadCouponsPage(
  refreshed = false,
  error: string | null = null,
): Promise<CouponsPageData> {
  const session = await getMercadoLivreSessionStatus();

  return {
    coupons: lastScrape?.coupons ?? [],
    couponsUrl: env.ML_COUPONS_URL,
    scrapedAt: lastScrape?.scrapedAt ?? null,
    source: lastScrape?.source ?? null,
    sessionOk: session.ok,
    sessionDetail: session.detail,
    refreshed,
    error,
  };
}

export async function refreshCoupons(): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  try {
    const result = await scrapeAffiliateCoupons();
    lastScrape = result;
    return { ok: true, count: result.coupons.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao buscar cupons';
    return { ok: false, error: message };
  }
}

export function getCouponsJson(): string {
  return JSON.stringify({
    coupons: lastScrape?.coupons ?? [],
    scrapedAt: lastScrape?.scrapedAt ?? null,
    source: lastScrape?.source ?? null,
    couponsUrl: env.ML_COUPONS_URL,
  });
}
