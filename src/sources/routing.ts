import type { Channel } from '../channels/types.js';
import {
  getActiveAmazonSourcesForChannel,
  getChannelsForAmazonSource,
  hydrateAmazonSourcesCache,
} from '../config/amazon-sources-config.js';
import {
  getActiveMlCategoriesForChannel,
  getChannelsForCategory,
  hydrateMlSourcesCache,
} from '../config/ml-sources-config.js';
import { isAmazonSourceUrl } from '../amazon/source-url.js';
import { iterateAmazonScrapedPages } from '../amazon/index.js';
import { iterateScrapedPages } from '../mercado-livre/index.js';
import type { RawOffer } from '../offers/types.js';

export async function hydrateAllSourcesCaches(): Promise<void> {
  await Promise.all([hydrateMlSourcesCache(), hydrateAmazonSourcesCache()]);
}

export function isAmazonCollectionSource(source: string): boolean {
  return isAmazonSourceUrl(source);
}

export function getActiveSourcesForChannel(channel: Channel): string[] {
  const ml = getActiveMlCategoriesForChannel(channel);
  const amazon = getActiveAmazonSourcesForChannel(channel);
  return [...ml, ...amazon];
}

export function getChannelsForSource(source: string): Channel[] {
  if (isAmazonCollectionSource(source)) {
    return getChannelsForAmazonSource(source);
  }
  return getChannelsForCategory(source);
}

export async function* iterateSourcePages(source: string): AsyncGenerator<RawOffer[]> {
  if (isAmazonCollectionSource(source)) {
    yield* iterateAmazonScrapedPages(source);
    return;
  }
  yield* iterateScrapedPages(source);
}
