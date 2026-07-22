import { getBrandName } from '../config/brand-config.js';
import { env } from '../config/env.js';
import { prisma } from '../database/client.js';
import type { MlCoupon } from '../mercado-livre/types.js';
import { cleanupRenderedMessage } from './message-template.js';

export const COUPON_PLACEHOLDERS = [
  { key: 'brand', label: 'Nome do seu canal', example: 'Radar Ofertas' },
  { key: 'discount', label: 'Desconto do cupom', example: 'R$ 20 OFF' },
  { key: 'store', label: 'Nome da loja', example: 'Lucas-home' },
  { key: 'title', label: 'Loja ou título do cupom', example: 'Darklab' },
  { key: 'code', label: 'Código promocional', example: '#PROMOAGRADARKLAB' },
  { key: 'expires', label: 'Data de validade', example: '01/08/2026' },
  { key: 'store_link', label: 'Link Ver produtos', example: 'https://lista.mercadolivre.com.br/_Container_...' },
  { key: 'category', label: 'Categoria do cupom', example: 'PRODUCT_DISCOUNT' },
  { key: 'min_purchase', label: 'Compra mínima', example: 'R$ 100' },
] as const;

export type CouponPlaceholderKey = (typeof COUPON_PLACEHOLDERS)[number]['key'];

export type CouponPlaceholderVisibility = Record<CouponPlaceholderKey, boolean>;

export const DEFAULT_COUPON_PLACEHOLDER_VISIBILITY: CouponPlaceholderVisibility = {
  brand: true,
  discount: true,
  store: true,
  title: false,
  code: true,
  expires: true,
  store_link: true,
  category: false,
  min_purchase: false,
};

export const DEFAULT_COUPON_TEMPLATE = `🎟️ CUPOM — {{brand}}

🏷️ {{discount}}

🏬 Em produtos de {{store}}

🔖 Código: {{code}}

📅 Válido até: {{expires}}

🛒 Ver produtos:
{{store_link}}`;

const KEYS = {
  template: 'couponMessageTemplate',
  placeholders: 'couponMessageTemplatePlaceholders',
} as const;

let templateCache: string | null = null;
let placeholderCache: CouponPlaceholderVisibility | null = null;

function formatExpiresAt(expiresAt: string | null): string {
  if (!expiresAt) return '';
  const parsed = Date.parse(expiresAt);
  if (!Number.isFinite(parsed)) return expiresAt;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: env.APP_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(parsed));
}

function formatCouponTitle(coupon: MlCoupon): string {
  const storeName = coupon.storeName ?? '';
  if (storeName && storeName !== coupon.discountLabel && storeName !== coupon.code) return storeName;
  if (!coupon.title || coupon.title === coupon.discountLabel || coupon.title === coupon.code) return '';
  return coupon.title;
}

export interface CouponTemplateValues {
  brand: string;
  discount: string;
  store: string;
  title: string;
  code: string;
  expires: string;
  store_link: string;
  category: string;
  min_purchase: string;
}

export function buildCouponTemplateValues(coupon: MlCoupon): CouponTemplateValues {
  const store = coupon.storeName ?? formatCouponTitle(coupon);
  return {
    brand: getBrandName(),
    discount: coupon.discountLabel,
    store,
    title: formatCouponTitle(coupon),
    code: coupon.code ?? '',
    expires: formatExpiresAt(coupon.expiresAt),
    store_link: coupon.storeUrl ?? '',
    category: coupon.category ?? '',
    min_purchase: coupon.minPurchase ?? '',
  };
}

export function renderCouponTemplate(
  template: string,
  values: CouponTemplateValues,
  visibility: CouponPlaceholderVisibility = DEFAULT_COUPON_PLACEHOLDER_VISIBILITY,
): string {
  const rendered = template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    if (!(key in values)) return match;

    const placeholderKey = key as CouponPlaceholderKey;
    if (!visibility[placeholderKey]) return '';

    return values[placeholderKey];
  });

  return cleanupRenderedMessage(rendered);
}

export function formatCouponMessageFromTemplate(
  template: string,
  coupon: MlCoupon,
  visibility: CouponPlaceholderVisibility = DEFAULT_COUPON_PLACEHOLDER_VISIBILITY,
): string {
  return renderCouponTemplate(template, buildCouponTemplateValues(coupon), visibility);
}

function mergeCouponPlaceholderVisibility(
  override: Partial<CouponPlaceholderVisibility> | undefined,
): CouponPlaceholderVisibility {
  const merged = { ...DEFAULT_COUPON_PLACEHOLDER_VISIBILITY };
  if (!override) return merged;

  for (const placeholder of COUPON_PLACEHOLDERS) {
    if (override[placeholder.key] !== undefined) {
      merged[placeholder.key] = override[placeholder.key]!;
    }
  }

  return merged;
}

export async function loadCouponPlaceholderVisibility(): Promise<CouponPlaceholderVisibility> {
  if (placeholderCache) return placeholderCache;
  try {
    const row = await prisma.setting.findUnique({ where: { key: KEYS.placeholders } });
    if (row) {
      const parsed = JSON.parse(row.value) as Partial<CouponPlaceholderVisibility>;
      placeholderCache = mergeCouponPlaceholderVisibility(parsed);
      return placeholderCache;
    }
  } catch {
    /* fallback */
  }
  return { ...DEFAULT_COUPON_PLACEHOLDER_VISIBILITY };
}

export async function saveCouponPlaceholderVisibility(visibility: CouponPlaceholderVisibility): Promise<void> {
  const json = JSON.stringify(visibility);
  await prisma.setting.upsert({
    where: { key: KEYS.placeholders },
    update: { value: json },
    create: { key: KEYS.placeholders, value: json },
  });
  placeholderCache = visibility;
}

export function parseCouponPlaceholderVisibilityFromForm(form: Record<string, string>): CouponPlaceholderVisibility {
  const visibility = {} as CouponPlaceholderVisibility;

  for (const placeholder of COUPON_PLACEHOLDERS) {
    visibility[placeholder.key] = form[`coupon_placeholder_${placeholder.key}`] === '1';
  }

  return visibility;
}

export async function loadCouponTemplate(): Promise<string> {
  if (templateCache) return templateCache;
  try {
    const row = await prisma.setting.findUnique({ where: { key: KEYS.template } });
    if (row) {
      const trimmed = row.value.trim();
      if (trimmed) {
        templateCache = trimmed;
        return trimmed;
      }
    }
  } catch {
    /* fallback */
  }
  return DEFAULT_COUPON_TEMPLATE;
}

export async function saveCouponTemplate(template: string): Promise<void> {
  const trimmed = template.trim();
  if (!trimmed) {
    throw new Error('O template de cupom não pode ficar vazio');
  }

  await prisma.setting.upsert({
    where: { key: KEYS.template },
    update: { value: trimmed },
    create: { key: KEYS.template, value: trimmed },
  });
  templateCache = trimmed;
}

export async function hydrateCouponTemplateCache(): Promise<void> {
  await Promise.all([loadCouponTemplate(), loadCouponPlaceholderVisibility()]);
}

export function sampleCouponTemplateValues(): CouponTemplateValues {
  return {
    brand: getBrandName(),
    discount: 'R$ 20 OFF',
    store: 'Lucas-home',
    title: 'Darklab',
    code: '#PROMOAGRADARKLAB',
    expires: '01/08/2026',
    store_link: 'https://lista.mercadolivre.com.br/_Container_pega-mais-21-off-seller-1784313015',
    category: 'PRODUCT_DISCOUNT',
    min_purchase: 'R$ 100',
  };
}
