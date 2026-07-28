import type { SerializedOffer } from '../types/api.js';

export type OfferPlatform = 'mercado_livre' | 'amazon' | 'unknown';

const PLATFORM_META = {
  mercado_livre: { label: 'Mercado Livre', short: 'ML', idLabel: 'ML ID' },
  amazon: { label: 'Amazon', short: 'Amazon', idLabel: 'ASIN' },
  unknown: { label: 'Desconhecida', short: '?', idLabel: 'ID do produto' },
} as const satisfies Record<
  OfferPlatform,
  { label: string; short: string; idLabel: string }
>;

const MLB_ID_PATTERN = /^MLB-?\d+/i;
const ASIN_PATTERN = /^[A-Z0-9]{10}$/;

function looksLikeMercadoLivreId(productId: string): boolean {
  return MLB_ID_PATTERN.test(productId.trim());
}

function looksLikeAmazonAsin(productId: string): boolean {
  return ASIN_PATTERN.test(productId.trim().toUpperCase());
}

function isAmazonUrl(permalink: string): boolean {
  return /(^|\.)amazon\./i.test(permalink) || /\/dp\/[A-Z0-9]{10}/i.test(permalink);
}

function isMercadoLivreUrl(permalink: string): boolean {
  return /mercadolivre|mercadolibre/i.test(permalink);
}

export function detectOfferPlatform(
  offer: Pick<SerializedOffer, 'mercadoLivreId' | 'permalink'>,
): OfferPlatform {
  const permalink = offer.permalink?.trim() ?? '';
  if (permalink) {
    if (isAmazonUrl(permalink)) return 'amazon';
    if (isMercadoLivreUrl(permalink)) return 'mercado_livre';
  }

  const productId = offer.mercadoLivreId.trim();
  if (looksLikeMercadoLivreId(productId)) return 'mercado_livre';
  if (looksLikeAmazonAsin(productId)) return 'amazon';

  return 'unknown';
}

export function offerPlatformLabel(platform: OfferPlatform): string {
  return PLATFORM_META[platform].label;
}

export function offerPlatformShortLabel(platform: OfferPlatform): string {
  return PLATFORM_META[platform].short;
}

export function offerProductIdLabel(platform: OfferPlatform): string {
  return PLATFORM_META[platform].idLabel;
}

export function parseAmazonReviewsCount(salesRank: string | null): number | null {
  if (!salesRank?.trim()) return null;
  const digits = salesRank.replace(/[^\d]/g, '');
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function formatOfferRating(
  rating: number | null,
  platform: OfferPlatform,
  reviewsCount: number | null = null,
): string {
  if (rating === null) return 'Sem avaliação';

  if (platform === 'amazon') {
    const ratingText = `${rating.toFixed(1).replace('.', ',')} de 5 estrelas`;
    if (reviewsCount !== null && reviewsCount > 0) {
      return `${ratingText} (${reviewsCount.toLocaleString('pt-BR')})`;
    }
    return ratingText;
  }

  return `${rating.toFixed(1)} ⭐`;
}

export function formatSoldQuantity(
  soldQuantity: number | null,
  platform: OfferPlatform,
): string {
  if (soldQuantity === null || soldQuantity <= 0) return 'Sem dados de vendas';

  if (platform === 'amazon') {
    if (soldQuantity >= 1000) {
      const thousands = soldQuantity / 1000;
      const label = Number.isInteger(thousands)
        ? `${thousands} mil`
        : `${thousands.toFixed(1).replace('.', ',')} mil`;
      return `Mais de ${label} compras no mês passado`;
    }
    return `Mais de ${soldQuantity.toLocaleString('pt-BR')} compras no mês passado`;
  }

  return `${soldQuantity.toLocaleString('pt-BR')} vendidos`;
}
