import { invalidateAccountsCache } from '../accounts/repository.js';
import { hydrateBrandCache } from '../config/brand-config.js';
import { hydrateCouponsConfigCache } from '../config/coupons-config-store.js';
import { hydrateMlSourcesCache } from '../config/ml-sources-config.js';
import {
  hydrateQueueConfigCache,
  invalidateQueueConfigCache,
} from '../config/queue-config-store.js';
import { hydrateScoreConfigCache, invalidateScoreConfigCache } from '../config/score-config.js';
import {
  publishCacheInvalidation,
  registerCacheInvalidationHandler,
  startCacheInvalidationSubscriber,
  type CacheDomain,
} from './cache-coherence.js';

export function registerConfigCacheHandlers(): void {
  registerCacheInvalidationHandler('accounts', () => {
    invalidateAccountsCache();
  });

  registerCacheInvalidationHandler('queue-config', async () => {
    invalidateQueueConfigCache();
    await hydrateQueueConfigCache();
  });

  registerCacheInvalidationHandler('score-config', async () => {
    invalidateScoreConfigCache();
    await hydrateScoreConfigCache();
  });

  registerCacheInvalidationHandler('brand-config', async () => {
    invalidateBrandCache();
    await hydrateBrandCache();
  });

  registerCacheInvalidationHandler('ml-sources', async () => {
    invalidateMlSourcesCache();
    await hydrateMlSourcesCache();
  });

  registerCacheInvalidationHandler('coupons-config', async () => {
    invalidateCouponsConfigCache();
    await hydrateCouponsConfigCache();
  });
}

export async function bootstrapCacheCoherence(): Promise<void> {
  registerConfigCacheHandlers();
  await startCacheInvalidationSubscriber();
}

export async function notifyConfigCacheChange(...domains: CacheDomain[]): Promise<void> {
  await publishCacheInvalidation(...domains);
}
