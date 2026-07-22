import { buildAffiliateLink } from '../mercado-livre/index.js';
import type { MlCoupon } from '../mercado-livre/types.js';
import {
  formatCouponMessageFromTemplate,
  loadCouponPlaceholderVisibility,
  loadCouponTemplate,
} from './coupon-template.js';

const COUPON_STORE_LINK_TIMEOUT_MS = 10_000;

export function isShortAffiliateLink(url: string): boolean {
  try {
    const { hostname, pathname } = new URL(url);
    if (hostname === 'meli.la') return true;
    if (/\/sec\//i.test(pathname)) return true;
  } catch {
    /* URL inválida — trata como longa */
  }
  return false;
}

async function shortenCouponStoreLink(coupon: MlCoupon): Promise<string> {
  const storeUrl = coupon.storeUrl?.trim();
  if (!storeUrl) return '';
  if (isShortAffiliateLink(storeUrl)) return storeUrl;

  const cacheKey = `coupon:${coupon.id}|${coupon.code ?? ''}`;
  return buildAffiliateLink(storeUrl, cacheKey, undefined, {
    allowBrowser: false,
    timeoutMs: COUPON_STORE_LINK_TIMEOUT_MS,
  });
}

export async function formatCouponMessage(coupon: MlCoupon): Promise<string> {
  const [template, visibility, storeLink] = await Promise.all([
    loadCouponTemplate(),
    loadCouponPlaceholderVisibility(),
    shortenCouponStoreLink(coupon),
  ]);
  return formatCouponMessageFromTemplate(template, coupon, visibility, storeLink);
}
