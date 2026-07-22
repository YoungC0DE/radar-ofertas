import { loadCouponsPage, refreshCoupons, getCouponsJson } from '../models/coupons-model.js';
import { renderCouponsPage } from '../views/coupons.js';

export async function showCouponsPage(refreshed = false, error: string | null = null): Promise<string> {
  const data = await loadCouponsPage(refreshed, error);
  return renderCouponsPage(data);
}

export async function handleCouponsRefresh(): Promise<string> {
  const result = await refreshCoupons();
  if (!result.ok) {
    return showCouponsPage(false, result.error);
  }
  return showCouponsPage(true, null);
}

export function getCouponsApiJson(): string {
  return getCouponsJson();
}
