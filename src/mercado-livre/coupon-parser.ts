import * as cheerio from 'cheerio';
import type { MlCoupon } from './types.js';

const JSON_STATE_PATTERNS = [
  /__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\})\s*;/,
  /window\.__NORDIC_STATE__\s*=\s*(\{[\s\S]*?\})\s*;/,
  /"coupons"\s*:\s*(\[[\s\S]*?\])/,
];

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function pickFirstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return value;
  }
  return null;
}

function normalizeStatus(raw: string | null): MlCoupon['status'] {
  if (!raw) return 'unknown';
  const lower = raw.toLowerCase();
  if (/expir|vencid|inactive|inativ/i.test(lower)) return 'expired';
  if (/gerad|created|active|ativ|dispon/i.test(lower)) return /gerad|created/i.test(lower) ? 'generated' : 'available';
  if (/available|dispon/i.test(lower)) return 'available';
  return 'unknown';
}

function mapCouponRecord(record: Record<string, unknown>, index: number): MlCoupon | null {
  const title =
    pickFirstString(record, ['title', 'name', 'label', 'headline', 'coupon_name', 'couponName']) ??
    pickFirstString(record, ['benefit', 'benefit_label', 'benefitLabel']);

  if (!title) return null;

  const discountLabel =
    pickFirstString(record, [
      'discount',
      'discount_label',
      'discountLabel',
      'benefit',
      'benefit_label',
      'benefitLabel',
      'amount',
      'value',
      'saving',
    ]) ?? '';

  const code = pickFirstString(record, ['code', 'coupon_code', 'couponCode', 'promo_code', 'promoCode']);
  const description =
    pickFirstString(record, ['description', 'subtitle', 'detail', 'details', 'summary', 'conditions']) ?? '';
  const category = pickFirstString(record, ['category', 'category_name', 'categoryName', 'segment', 'type']);
  const minPurchase = pickFirstString(record, [
    'min_purchase',
    'minPurchase',
    'minimum_purchase',
    'minimumPurchase',
    'min_amount',
    'minAmount',
  ]);
  const expiresAt = pickFirstString(record, [
    'expires_at',
    'expiresAt',
    'expiration_date',
    'expirationDate',
    'valid_until',
    'validUntil',
    'end_date',
    'endDate',
  ]);
  const rawStatus = pickFirstString(record, ['status', 'state', 'availability', 'coupon_status', 'couponStatus']);
  const id =
    pickFirstString(record, ['id', 'coupon_id', 'couponId', 'campaign_id', 'campaignId']) ??
    `${title}-${code ?? discountLabel}-${index}`;

  const hasCouponSignal =
    Boolean(code) ||
    Boolean(discountLabel) ||
    /cupom|coupon|voucher|promo|desconto/i.test(`${title} ${description} ${JSON.stringify(record)}`);

  if (!hasCouponSignal) return null;

  return {
    id,
    title,
    description,
    discountLabel,
    code,
    category,
    minPurchase,
    expiresAt,
    status: normalizeStatus(rawStatus),
    rawStatus,
  };
}

function looksLikeCouponObject(record: Record<string, unknown>): boolean {
  const keys = Object.keys(record).join(' ').toLowerCase();
  const hasCouponKey = /coupon|cupom|voucher|promo|campaign|benefit/.test(keys);
  const title = pickFirstString(record, ['title', 'name', 'label', 'headline', 'coupon_name', 'couponName']);
  const code = pickFirstString(record, ['code', 'coupon_code', 'couponCode']);
  const discount = pickFirstString(record, ['discount', 'discount_label', 'benefit', 'amount', 'value']);
  return Boolean(title) && (hasCouponKey || Boolean(code) || Boolean(discount));
}

export function collectCouponsFromUnknown(node: unknown, bucket: MlCoupon[]): void {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const entry of node) collectCouponsFromUnknown(entry, bucket);
    return;
  }

  const record = node as Record<string, unknown>;

  if (looksLikeCouponObject(record)) {
    const mapped = mapCouponRecord(record, bucket.length);
    if (mapped) bucket.push(mapped);
  }

  for (const value of Object.values(record)) {
    collectCouponsFromUnknown(value, bucket);
  }
}

function extractJsonBlobs(html: string): string[] {
  const blobs: string[] = [];
  for (const pattern of JSON_STATE_PATTERNS) {
    const match = html.match(pattern);
    if (match?.[1]) blobs.push(match[1]);
  }
  return blobs;
}

function parseDomCoupons(html: string): MlCoupon[] {
  const $ = cheerio.load(html);
  const coupons: MlCoupon[] = [];

  const selectors = [
    '[data-testid*="coupon"]',
    '[class*="coupon"]',
    '[class*="cupom"]',
    'article',
    'li',
  ];

  for (const selector of selectors) {
    $(selector).each((index, element) => {
      const el = $(element);
      const text = el.text().replace(/\s+/g, ' ').trim();
      if (!text || text.length < 8) return;
      if (!/cupom|coupon|desconto|off|%/i.test(text)) return;

      const title =
        el.find('h1,h2,h3,h4,[class*="title"]').first().text().trim() ||
        text.split('\n').find((line) => line.trim().length > 3)?.trim() ||
        text.slice(0, 80);

      const code =
        text.match(/(?:c[oó]digo|code)\s*:?\s*([A-Z0-9]{4,})/i)?.[1] ??
        (el.find('[class*="code"]').first().text().trim() || null);

      const discountLabel =
        text.match(/\d+\s*%|\d+\s*OFF|R\$\s*[\d.,]+/i)?.[0] ?? '';

      coupons.push({
        id: `dom-${selector}-${index}-${title.slice(0, 24)}`,
        title,
        description: text.length > title.length ? text : '',
        discountLabel,
        code: code || null,
        category: null,
        minPurchase: text.match(/compra m[ií]nima[^.]+/i)?.[0] ?? null,
        expiresAt: text.match(/v[aá]lid[oa][^.]+/i)?.[0] ?? null,
        status: /gerar|dispon[ií]vel|ativar/i.test(text) ? 'available' : 'unknown',
        rawStatus: null,
      });
    });
  }

  return coupons;
}

function dedupeCoupons(coupons: MlCoupon[]): MlCoupon[] {
  const seen = new Set<string>();
  const result: MlCoupon[] = [];

  for (const coupon of coupons) {
    const key = `${coupon.title}|${coupon.code ?? ''}|${coupon.discountLabel}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(coupon);
  }

  return result;
}

export function parseCouponsHtml(html: string): MlCoupon[] {
  const coupons: MlCoupon[] = [];

  for (const blob of extractJsonBlobs(html)) {
    try {
      collectCouponsFromUnknown(JSON.parse(blob), coupons);
    } catch {
      // JSON parcial — ignorar
    }
  }

  try {
    collectCouponsFromUnknown(JSON.parse(html), coupons);
  } catch {
    // não é JSON puro
  }

  coupons.push(...parseDomCoupons(html));

  return dedupeCoupons(coupons);
}

export function parseCouponsJson(data: unknown): MlCoupon[] {
  const coupons: MlCoupon[] = [];
  collectCouponsFromUnknown(data, coupons);
  return dedupeCoupons(coupons);
}

export function isLoginHtml(html: string): boolean {
  return /Digite seu e-mail ou telefone para iniciar sessão|login|registration|account-verification/i.test(html);
}
