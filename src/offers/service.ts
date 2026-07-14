import { env } from '../config/env.js';
import { getSearchLimit } from '../config/queue-config-store.js';
import { calculateOfferScore, getRuntimeScoreConfig } from '../config/score-config.js';
import { iterateScrapedPages } from '../mercado-livre/index.js';
import { enqueueOfferSend, getSenderQueue, isRedisEnabled } from '../queue/index.js';
import { logger } from '../utils/logger.js';
import { formatOfferMessageFromTemplate, loadMessageTemplate, loadPlaceholderVisibility } from './message-template.js';
import {
  createOffer,
  deletePendingOffers,
  findOfferById,
  findPendingOfferIds,
  offerExists,
  sentOfferExistsByTitleAndPrice,
} from './repository.js';
import type { OfferRecord, RawOffer } from './types.js';

export async function formatOfferMessage(offer: OfferRecord): Promise<string> {
  const [template, visibility] = await Promise.all([
    loadMessageTemplate(),
    loadPlaceholderVisibility(),
  ]);
  return formatOfferMessageFromTemplate(template, offer, visibility);
}

export async function processOffer(rawOffer: RawOffer): Promise<string | null> {
  const scoreConfig = getRuntimeScoreConfig();
  const score = calculateOfferScore(rawOffer);

  if (score < scoreConfig.minScore) {
    logger.debug({ mercadoLivreId: rawOffer.mercadoLivreId, score }, 'Below min score');
    return null;
  }

  if (await offerExists(rawOffer.mercadoLivreId)) {
    logger.debug({ mercadoLivreId: rawOffer.mercadoLivreId }, 'Offer already exists');
    return null;
  }

  if (await sentOfferExistsByTitleAndPrice(rawOffer.title, rawOffer.price)) {
    logger.debug({ title: rawOffer.title, price: rawOffer.price }, 'Duplicate sent offer (same title+price)');
    return null;
  }

  // Não geramos o link de afiliado aqui. Guardamos o permalink e deixamos o link
  // nulo — ele é gerado sob demanda na hora do envio (sender), evitando chamadas
  // ao ML para ofertas que talvez nunca sejam enviadas.
  const offer = await createOffer({
    mercadoLivreId: rawOffer.mercadoLivreId,
    title: rawOffer.title,
    price: rawOffer.price,
    oldPrice: rawOffer.oldPrice,
    discount: rawOffer.discount,
    image: rawOffer.image,
    permalink: rawOffer.permalink,
    affiliateLink: null,
    rating: rawOffer.rating,
    soldQuantity: rawOffer.soldQuantity,
    salesRank: rawOffer.salesRank,
    score,
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
