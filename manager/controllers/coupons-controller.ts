import {
  loadCouponsPage,
  refreshCoupons,
  getCouponsJson,
  sendCouponToChannels,
  updateCouponStoreLink,
} from '../models/coupons-model.js';
import { renderCouponsPage } from '../views/coupons.js';

export async function showCouponsPage(
  refreshed = false,
  error: string | null = null,
  sendMessage: string | null = null,
): Promise<string> {
  const data = await loadCouponsPage(refreshed, error, sendMessage);
  return renderCouponsPage(data);
}

export async function handleCouponsRefresh(): Promise<string> {
  const result = await refreshCoupons();
  if (!result.ok) {
    return showCouponsPage(false, result.error);
  }
  return showCouponsPage(true, null);
}

export async function handleCouponSend(couponId: string, code?: string | null): Promise<string> {
  const result = await sendCouponToChannels(couponId, code);
  if (!result.ok) {
    return showCouponsPage(false, result.error);
  }
  return showCouponsPage(false, null, result.message);
}

export async function handleCouponStoreLinkSave(
  couponId: string,
  storeUrl: string,
  code?: string | null,
): Promise<string> {
  const result = await updateCouponStoreLink(couponId, storeUrl, code);
  if (!result.ok) {
    return showCouponsPage(false, result.error);
  }
  return showCouponsPage(false, null, 'Link da loja salvo.');
}

export function getCouponsApiJson(): string {
  return getCouponsJson();
}
