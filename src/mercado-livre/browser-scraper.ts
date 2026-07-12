import { chromium, type BrowserContextOptions } from 'playwright';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import {
  buildCategoryListingUrl,
  buildOffersPaginatedUrl,
  maxOffersPagesForLimit,
  validateCategoryConfig,
} from './category-url.js';
import { parseListingHtml } from './parser.js';
import { loadStorageState } from './session.js';
import type { ScrapedItem } from './types.js';

function isBlockedHtml(html: string): boolean {
  return /captcha|challenge|account-verification|suspicious-traffic/i.test(html);
}

function mergeUniqueItems(
  unique: Map<string, ScrapedItem>,
  items: ScrapedItem[],
): number {
  let added = 0;
  for (const item of items) {
    if (!unique.has(item.id)) {
      unique.set(item.id, item);
      added++;
    }
  }
  return added;
}

async function scrapeOffersPages(
  goto: (url: string) => Promise<string>,
  baseUrl: string,
): Promise<{ items: ScrapedItem[]; pagesFetched: number }> {
  const unique = new Map<string, ScrapedItem>();
  const maxPages = maxOffersPagesForLimit(env.ML_SEARCH_LIMIT);
  let stalePages = 0;
  let pagesFetched = 0;

  for (let page = 0; page < maxPages; page++) {
    const url = buildOffersPaginatedUrl(baseUrl, page);
    const html = await goto(url);
    pagesFetched++;

    if (isBlockedHtml(html)) {
      throw new Error(`Browser blocked by anti-bot for ${url}`);
    }

    const items = parseListingHtml(html, env.ML_SEARCH_LIMIT);
    if (items.length === 0) break;

    const added = mergeUniqueItems(unique, items);
    if (added === 0) {
      stalePages++;
      if (stalePages >= 2) break;
    } else {
      stalePages = 0;
    }

    if (unique.size >= env.ML_SEARCH_LIMIT) break;
  }

  return {
    items: [...unique.values()].slice(0, env.ML_SEARCH_LIMIT),
    pagesFetched,
  };
}

export async function fetchCategoryViaBrowser(category: string): Promise<ScrapedItem[]> {
  const validation = validateCategoryConfig(category);
  if (!validation.valid) {
    throw new Error(`Invalid category config "${category}": ${validation.reason}`);
  }

  const state = await loadStorageState();
  const browser = await chromium.launch({ headless: env.ML_BROWSER_HEADLESS });

  try {
    const context = await browser.newContext({
      userAgent: env.ML_SCRAPER_USER_AGENT,
      locale: 'pt-BR',
      storageState: state ? (state as BrowserContextOptions['storageState']) : undefined,
    });
    const page = await context.newPage();

    const gotoAndGetHtml = async (url: string): Promise<string> => {
      await page.goto(url, { waitUntil: 'networkidle', timeout: env.ML_HTTP_TIMEOUT_MS });
      await page.waitForTimeout(2500);
      return page.content();
    };

    if (validation.listingKind === 'offers') {
      const { items, pagesFetched } = await scrapeOffersPages(gotoAndGetHtml, validation.url);

      if (items.length === 0) {
        throw new Error(`Browser scrape returned no products for ${validation.url}`);
      }

      logger.info(
        {
          category: validation.category,
          url: validation.url,
          count: items.length,
          pages: pagesFetched,
          listingKind: 'offers',
          method: 'browser',
        },
        'Offers page scraped',
      );
      return items;
    }

    const url = buildCategoryListingUrl(validation.category);
    const html = await gotoAndGetHtml(url);

    if (isBlockedHtml(html)) {
      throw new Error(`Browser blocked by anti-bot for ${url}`);
    }

    const items = parseListingHtml(html, env.ML_SEARCH_LIMIT);

    if (items.length === 0) {
      throw new Error(`Browser scrape returned no products for ${url}`);
    }

    logger.info(
      { category: validation.category, url, count: items.length, listingKind: 'category', method: 'browser' },
      'Category scraped',
    );
    return items;
  } finally {
    await browser.close();
  }
}
