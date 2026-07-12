import { env } from '../config/env.js';
import { runWithConcurrency } from '../utils/concurrency.js';
import { logger } from '../utils/logger.js';
import type { RawOffer } from '../offers/types.js';
import { generateAffiliateLink } from './affiliate-link.js';
import { fetchCategoryViaBrowser } from './browser-scraper.js';
import { fetchCategoryViaHttp, validateCategoryConfig } from './http-scraper.js';
import type { ScrapedItem } from './types.js';

const CATEGORY_CONCURRENCY = 2;

function mapToRawOffer(item: ScrapedItem): RawOffer {
  const oldPrice = item.originalPrice;
  const discount =
    oldPrice && oldPrice > item.price
      ? Math.round(((oldPrice - item.price) / oldPrice) * 100)
      : null;

  return {
    mercadoLivreId: item.id,
    title: item.title,
    price: item.price,
    oldPrice,
    discount,
    image: item.thumbnail?.replace('-I.jpg', '-O.jpg') ?? null,
    rating: item.rating,
    soldQuantity: item.soldQuantity,
    permalink: item.permalink,
  };
}

async function scrapeCategory(category: string): Promise<ScrapedItem[]> {
  try {
    return await fetchCategoryViaHttp(category);
  } catch (httpError) {
    logger.warn({ category, httpError }, 'HTTP scrape failed');

    if (!env.ML_USE_BROWSER_FALLBACK) throw httpError;

    return fetchCategoryViaBrowser(category);
  }
}

export async function buildAffiliateLink(
  permalink: string,
  mercadoLivreId?: string,
): Promise<string> {
  return generateAffiliateLink(permalink, mercadoLivreId);
}

export async function searchConfiguredCategories(): Promise<RawOffer[]> {
  const categories = env.ML_CATEGORIES.map((category) => {
    const validation = validateCategoryConfig(category);
    if (!validation.valid) {
      logger.error({ category, reason: validation.reason }, 'Invalid ML category config');
    }
    return validation;
  }).filter((validation) => validation.valid);

  if (categories.length === 0) {
    logger.error('No valid ML categories configured');
    return [];
  }

  const results = await runWithConcurrency(categories, CATEGORY_CONCURRENCY, async (validation) => {
    try {
      const items = await scrapeCategory(validation.category);
      logger.info(
        {
          category: validation.category,
          type: validation.type,
          listingKind: validation.listingKind,
          count: items.length,
        },
        'Category search completed',
      );
      return items.map(mapToRawOffer);
    } catch (error) {
      logger.error({ category: validation.category, error }, 'Failed to search category');
      return [] as RawOffer[];
    }
  });

  return results.flat();
}
