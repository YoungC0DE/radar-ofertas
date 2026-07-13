import { env } from '../config/env.js';
import type { QueueConfig } from '../config/env.js';
import { buildAffiliateLink } from '../mercado-livre/index.js';
import { enqueueOfferSend } from '../queue/index.js';
import { logger } from '../utils/logger.js';
<<<<<<< Updated upstream
import { createOffer, offerExists } from './repository.js';
=======
import { formatOfferMessageFromTemplate, loadMessageTemplate, loadPlaceholderVisibility } from './message-template.js';
import {
  createOffer,
  deletePendingOffers,
  findOfferById,
  findPendingOfferIds,
  offerExists,
} from './repository.js';
>>>>>>> Stashed changes
import type { OfferRecord, RawOffer, ScoredOffer } from './types.js';

function calculateScore(offer: RawOffer, config: QueueConfig): number {
  let score = 0;

  if (offer.discount !== null) {
    if (offer.discount >= 30) score += 30;
    else if (offer.discount >= 20) score += 20;
    else if (offer.discount >= 10) score += 10;
  }

  if (offer.rating !== null) {
    if (offer.rating >= 4.5) score += 20;
    else if (offer.rating >= 4.0) score += 10;
  }

  if (offer.soldQuantity !== null) {
    if (offer.soldQuantity >= config.minSoldQuantity) score += 20;
    else if (offer.soldQuantity >= config.minSoldQuantity / 2) score += 10;
  }

  if (offer.price <= config.maxPrice) score += 15;
  if (offer.price <= config.maxPrice / 2) score += 10;

  return score;
}

async function scoreOffer(offer: RawOffer, config: QueueConfig): Promise<ScoredOffer> {
  return {
    ...offer,
    score: calculateScore(offer, config),
    affiliateLink: await buildAffiliateLink(offer.permalink, offer.mercadoLivreId),
  };
}

<<<<<<< Updated upstream
function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatOfferMessage(offer: OfferRecord): string {
  const showOldPrice = offer.oldPrice != null && offer.oldPrice > offer.price;
  const priceLine = showOldPrice
    ? `${formatCurrency(offer.price)} (de ${formatCurrency(offer.oldPrice)})`
    : formatCurrency(offer.price);

  const rating =
    offer.rating === null ? 'Sem avaliação' : `${offer.rating.toFixed(1)} ⭐`;

  return (
    `${offer.title}\n\n` +
    '💰 Preço:\n' +
    `${priceLine}\n\n` +
    '⭐ Avaliação:\n' +
    `${rating}\n\n` +
    '🛒 Comprar:\n' +
    `${offer.affiliateLink ?? ''}`
  );
=======
export async function formatOfferMessage(offer: OfferRecord): Promise<string> {
  const [template, visibility] = await Promise.all([
    loadMessageTemplate(),
    loadPlaceholderVisibility(),
  ]);
  return formatOfferMessageFromTemplate(template, offer, visibility);
>>>>>>> Stashed changes
}

export async function processOffer(rawOffer: RawOffer): Promise<string | null> {
  const scored = await scoreOffer(rawOffer, env.QUEUE_CONFIG);

  if (scored.score < env.QUEUE_CONFIG.minScore) {
    logger.debug({ mercadoLivreId: scored.mercadoLivreId, score: scored.score }, 'Below min score');
    return null;
  }

  if (await offerExists(scored.mercadoLivreId)) {
    logger.debug({ mercadoLivreId: scored.mercadoLivreId }, 'Offer already exists');
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
<<<<<<< Updated upstream
=======

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
      if (state === 'delayed') {
        await existing.promote();
        return;
      }
      if (state === 'active') {
        return;
      }
      await existing.remove();
    }

    await queue.add(
      'send',
      { offerId },
      {
        jobId,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  } finally {
    await queue.close();
  }
}
>>>>>>> Stashed changes
