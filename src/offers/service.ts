import { env } from '../config/env.js';
import {
  getAffiliateLinkBacklogDelayMinutesCached,
  getAffiliateLinkBacklogThresholdCached,
  getAffiliateLinkDelayMsCached,
  getSearchLimit,
} from '../config/queue-config-store.js';
import { calculateOfferScore, getRuntimeScoreConfig } from '../config/score-config.js';
import { buildAffiliateLink, iterateScrapedPages } from '../mercado-livre/index.js';
import { enqueueOfferSend, getSenderQueue, isRedisEnabled } from '../queue/index.js';
import { logger } from '../utils/logger.js';
import { formatOfferMessageFromTemplate, loadMessageTemplate, loadPlaceholderVisibility } from './message-template.js';
import {
  countOffers,
  createOffer,
  deletePendingOffers,
  findOfferById,
  findPendingOfferIds,
  offerExists,
  sentOfferExistsByTitleAndPrice,
} from './repository.js';
import type { OfferRecord, RawOffer, ScoredOffer } from './types.js';

async function resolveAffiliateLinkDelayMs(): Promise<number> {
  const pending = await countOffers('pending');
  const threshold = getAffiliateLinkBacklogThresholdCached();
  if (pending >= threshold) {
    const delayMs = getAffiliateLinkBacklogDelayMinutesCached() * 60 * 1000;
    logger.info({ pending, threshold, delayMs }, 'Pending backlog — slowing affiliate link calls');
    return delayMs;
  }
  return getAffiliateLinkDelayMsCached();
}

async function scoreOffer(offer: RawOffer): Promise<ScoredOffer> {
  const linkDelayMs = await resolveAffiliateLinkDelayMs();
  return {
    ...offer,
    score: calculateOfferScore(offer),
    affiliateLink: await buildAffiliateLink(offer.permalink, offer.mercadoLivreId, linkDelayMs),
  };
}

export async function formatOfferMessage(offer: OfferRecord): Promise<string> {
  const [template, visibility] = await Promise.all([
    loadMessageTemplate(),
    loadPlaceholderVisibility(),
  ]);
  return formatOfferMessageFromTemplate(template, offer, visibility);
}

export async function processOffer(rawOffer: RawOffer): Promise<string | null> {
  const scoreConfig = getRuntimeScoreConfig();
  const scored = await scoreOffer(rawOffer);

  if (scored.score < scoreConfig.minScore) {
    logger.debug({ mercadoLivreId: scored.mercadoLivreId, score: scored.score }, 'Below min score');
    return null;
  }

  if (await offerExists(scored.mercadoLivreId)) {
    logger.debug({ mercadoLivreId: scored.mercadoLivreId }, 'Offer already exists');
    return null;
  }

  if (await sentOfferExistsByTitleAndPrice(scored.title, scored.price)) {
    logger.debug({ title: scored.title, price: scored.price }, 'Duplicate sent offer (same title+price)');
    return null;
  }

  const offer = await createOffer({
    mercadoLivreId: scored.mercadoLivreId,
    title: scored.title,
    price: scored.price,
    oldPrice: scored.oldPrice,
    discount: scored.discount,
    image: scored.image,
    affiliateLink: scored.affiliateLink,
    rating: scored.rating,
    soldQuantity: scored.soldQuantity,
    salesRank: scored.salesRank,
    score: scored.score,
  });

  await enqueueOfferSend(offer.id);

  logger.info({ offerId: offer.id, score: offer.score }, 'Offer saved and enqueued');
  return offer.id;
}

export async function processOffers(rawOffers: RawOffer[]): Promise<number> {
  let enqueued = 0;
  for (const raw of rawOffers) {
    if (await processOffer(raw)) enqueued++;
  }
  return enqueued;
}

export async function collectNewOffers(): Promise<{ total: number; enqueued: number }> {
  const target = getSearchLimit();
  let total = 0;
  let enqueued = 0;

  for (const category of env.ML_CATEGORIES) {
    for await (const page of iterateScrapedPages(category)) {
      for (const offer of page) {
        total++;
        const id = await processOffer(offer);
        if (id) enqueued++;
      }
      if (enqueued >= target) break;
    }
    if (enqueued >= target) break;
  }

  return { total, enqueued };
}

export async function removeAllPendingOffers(): Promise<number> {
  const ids = await findPendingOfferIds();
  if (ids.length === 0) return 0;

  if (isRedisEnabled()) {
    const queue = getSenderQueue();
    try {
      for (const id of ids) {
        try {
          const job = await queue.getJob(`send-offer-${id}`);
          if (job) await job.remove();
        } catch (error) {
          logger.warn({ offerId: id, error }, 'Failed to remove sender job');
        }
      }
    } finally {
      await queue.close();
    }
  }

  const deleted = await deletePendingOffers();
  logger.info({ deleted }, 'Pending offers removed');
  return deleted;
}

export async function sendOfferNow(offerId: string): Promise<void> {
  const offer = await findOfferById(offerId);
  if (!offer) {
    throw new Error('Oferta não encontrada');
  }
  if (offer.sentAt) {
    throw new Error('Oferta já foi enviada');
  }
  if (!isRedisEnabled()) {
    throw new Error('Redis desabilitado — não é possível enfileirar envio');
  }

  const queue = getSenderQueue();
  const jobId = `send-offer-${offerId}`;

  try {
    const existing = await queue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'active') {
        return;
      }
      await existing.remove();
    }

    await queue.add(
      'send',
      { offerId, force: true },
      {
        jobId,
        priority: 1,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  } finally {
    await queue.close();
  }
}
