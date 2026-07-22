import { getCouponsUrlCached, getCouponsUrlFromDb, hydrateCouponsConfigCache } from '../../src/config/coupons-config-store.js';
import { sendCouponToChannelsNow } from '../../src/offers/coupon-service.js';
import { scrapeAffiliateCoupons } from '../../src/mercado-livre/coupons.js';
import type { CouponScrapeResult, MlCoupon } from '../../src/mercado-livre/types.js';

export interface CouponsPageData {
  coupons: MlCoupon[];
  couponsUrl: string;
  scrapedAt: string | null;
  source: CouponScrapeResult['source'] | null;
  refreshed: boolean;
  error: string | null;
  sendMessage: string | null;
}

let lastScrape: CouponScrapeResult | null = null;

function visibleCoupons(coupons: MlCoupon[]): MlCoupon[] {
  return coupons.filter((coupon) => coupon.status !== 'generated');
}

export async function loadCouponsPage(
  refreshed = false,
  error: string | null = null,
  sendMessage: string | null = null,
): Promise<CouponsPageData> {
  await hydrateCouponsConfigCache();
  const couponsUrl = await getCouponsUrlFromDb();

  return {
    coupons: visibleCoupons(lastScrape?.coupons ?? []),
    couponsUrl,
    scrapedAt: lastScrape?.scrapedAt ?? null,
    source: lastScrape?.source ?? null,
    refreshed,
    error,
    sendMessage,
  };
}

export async function refreshCoupons(): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  try {
    await hydrateCouponsConfigCache();
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
    coupons: visibleCoupons(lastScrape?.coupons ?? []),
    scrapedAt: lastScrape?.scrapedAt ?? null,
    source: lastScrape?.source ?? null,
    couponsUrl: getCouponsUrlCached(),
  });
}

function findCouponForSend(couponId: string, code?: string | null): MlCoupon | undefined {
  const pool = lastScrape?.coupons ?? [];
  if (code) {
    const byCode = pool.find((entry) => entry.code === code);
    if (byCode) return byCode;
  }

  const matches = pool.filter((entry) => entry.id === couponId);
  if (matches.length === 0) return undefined;

  return (
    matches.find((entry) => entry.status === 'available') ??
    matches.sort((a, b) => {
      const priority = (coupon: MlCoupon): number => {
        if (coupon.status === 'available') return 4;
        if (coupon.status === 'unknown') return 3;
        if (coupon.status === 'expired') return 2;
        return 1;
      };
      return priority(b) - priority(a);
    })[0]
  );
}

export async function sendCouponToChannels(
  couponId: string,
  code?: string | null,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  let coupon = findCouponForSend(couponId, code);
  if (!coupon) {
    const refreshed = await refreshCoupons();
    if (!refreshed.ok) {
      return { ok: false, error: 'Cupom não encontrado — atualize a lista e tente novamente.' };
    }
    coupon = findCouponForSend(couponId, code);
  }

  if (!coupon) {
    return { ok: false, error: 'Cupom não encontrado — atualize a lista e tente novamente.' };
  }
  if (coupon.status !== 'available') {
    return { ok: false, error: 'Só é possível enviar cupons com status Disponível.' };
  }

  try {
    const message = await sendCouponToChannelsNow(coupon);
    return { ok: true, message };
  } catch (error) {
    const err = error instanceof Error ? error.message : 'Falha ao enviar cupom';
    return { ok: false, error: err };
  }
}
