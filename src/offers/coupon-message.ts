import type { MlCoupon } from '../mercado-livre/types.js';
import {
  formatCouponMessageFromTemplate,
  loadCouponPlaceholderVisibility,
  loadCouponTemplate,
} from './coupon-template.js';

export async function formatCouponMessage(coupon: MlCoupon): Promise<string> {
  const [template, visibility] = await Promise.all([loadCouponTemplate(), loadCouponPlaceholderVisibility()]);
  return formatCouponMessageFromTemplate(template, coupon, visibility);
}
