import { buildOfferAffiliateLink, shouldRefreshAmazonAffiliateLink } from '../offers/affiliate-link.js';
import { detectOfferPlatform } from '../offers/platform.js';
import {
  updateOfferAffiliateLink,
  updateOfferMarketInsights,
} from '../offers/repository.js';
import type { OfferRecord } from '../offers/types.js';
import { logger } from '../utils/logger.js';
import { fetchAmazonProductPage } from './http-scraper.js';

export interface AmazonOfferHydrationResult {
  offer: OfferRecord;
  coupon: string | null;
}

function amazonProductUrl(offer: OfferRecord): string {
  return offer.permalink ?? `https://www.amazon.com.br/dp/${offer.mercadoLivreId}`;
}

export async function hydrateAmazonOfferRecord(
  offer: OfferRecord,
): Promise<AmazonOfferHydrationResult> {
  if (detectOfferPlatform(offer) !== 'amazon') {
    return { offer, coupon: null };
  }

  const permalink = amazonProductUrl(offer);
  let hydrated: OfferRecord = { ...offer };
  let coupon: string | null = null;

  const needsAffiliateLink =
    !offer.affiliateLink ||
    shouldRefreshAmazonAffiliateLink(permalink, offer.mercadoLivreId, offer.affiliateLink);

  if (needsAffiliateLink) {
    try {
      const affiliateLink = await buildOfferAffiliateLink(permalink, offer.mercadoLivreId);
      await updateOfferAffiliateLink(offer.id, affiliateLink);
      hydrated = { ...hydrated, affiliateLink };
    } catch (error) {
      logger.warn({ offerId: offer.id, error }, 'Falha ao gerar link afiliado Amazon no painel');
    }
  }

  const needsProductPage =
    !offer.seller ||
    offer.rating === null ||
    offer.soldQuantity === null ||
    !offer.salesRank;

  try {
    const product = await fetchAmazonProductPage(permalink);
    if (!product) return { offer: hydrated, coupon };

    coupon = product.coupon;

    if (needsProductPage) {
      const salesRank =
        product.reviewsCount !== null ? String(product.reviewsCount) : offer.salesRank;
      await updateOfferMarketInsights(offer.id, {
        rating: product.rating ?? offer.rating,
        soldQuantity: product.soldQuantity ?? offer.soldQuantity,
        salesRank,
        seller: product.seller ?? offer.seller,
      });
      hydrated = {
        ...hydrated,
        rating: product.rating ?? offer.rating,
        soldQuantity: product.soldQuantity ?? offer.soldQuantity,
        salesRank,
        seller: product.seller ?? offer.seller,
      };
    }
  } catch (error) {
    logger.warn({ offerId: offer.id, error }, 'Falha ao enriquecer oferta Amazon no painel');
  }

  return { offer: hydrated, coupon };
}
