import { getActiveMlCategories, hydrateMlSourcesCache } from '../config/ml-sources-config.js';
import { getSearchLimit } from '../config/queue-config-store.js';
import { calculateOfferScore, getRuntimeScoreConfig } from '../config/score-config.js';
import { iterateScrapedPages } from '../mercado-livre/index.js';
import { enqueueOfferSend, getSenderQueue, isRedisEnabled } from '../queue/index.js';
import { runWithConcurrency } from '../utils/concurrency.js';
import { logger } from '../utils/logger.js';
import { allocateProportionalWithMin, shuffle } from './sampling.js';
import { formatOfferMessageFromTemplate, loadMessageTemplate, loadPlaceholderVisibility } from './message-template.js';
import {
  createOffer,
  deletePendingOfferById,
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
    seller: rawOffer.seller,
    officialStore: rawOffer.officialStore,
    bestSeller: rawOffer.bestSeller,
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

/** Páginas lidas por link ao montar o pool do sorteio. */
const POOL_PAGES_PER_SOURCE = 2;
const POOL_CONCURRENCY = 2;

async function collectPool(category: string): Promise<RawOffer[]> {
  const pool: RawOffer[] = [];
  let pages = 0;

  for await (const page of iterateScrapedPages(category)) {
    pool.push(...page);
    if (++pages >= POOL_PAGES_PER_SOURCE) break;
  }

  return pool;
}

export async function collectNewOffers(): Promise<{ total: number; enqueued: number }> {
  await hydrateMlSourcesCache();
  const target = getSearchLimit();
  const categories = getActiveMlCategories();

  if (categories.length === 0) {
    logger.warn('No active ML sources configured — nothing to collect');
    return { total: 0, enqueued: 0 };
  }

  // Buscamos o pool de todos os links ANTES de processar. Antes o laço parava no
  // primeiro link que enchesse a cota, e os demais nunca eram lidos.
  const pools = await runWithConcurrency(categories, POOL_CONCURRENCY, async (category) => {
    try {
      return { category, offers: shuffle(await collectPool(category)) };
    } catch (error) {
      logger.error({ category, error }, 'Failed to build pool for source');
      return { category, offers: [] as RawOffer[] };
    }
  });

  // Embaralhar a ordem dos pools importa: quando há menos vagas que links, o
  // mínimo de 1 vai para os primeiros da lista.
  const filled = shuffle(pools.filter((pool) => pool.offers.length > 0));
  if (filled.length === 0) {
    logger.warn({ sources: categories.length }, 'All sources returned empty — nothing to collect');
    return { total: 0, enqueued: 0 };
  }

  const quotas = allocateProportionalWithMin(filled.map((pool) => pool.offers.length), target);

  logger.info(
    {
      target,
      sources: filled.map((pool, index) => ({
        category: pool.category,
        pool: pool.offers.length,
        quota: quotas[index] ?? 0,
      })),
    },
    'Offer pools built — drawing across all sources',
  );

  const drawn = filled.flatMap((pool, index) => pool.offers.slice(0, quotas[index] ?? 0));
  // Reserva para repor sorteados que o processOffer recusar (score baixo, duplicado).
  const backfill = shuffle(filled.flatMap((pool, index) => pool.offers.slice(quotas[index] ?? 0)));

  let total = 0;
  let enqueued = 0;

  for (const offer of [...shuffle(drawn), ...backfill]) {
    if (enqueued >= target) break;
    total++;
    const id = await processOffer(offer);
    if (id) enqueued++;
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

export async function removePendingOffer(offerId: string): Promise<void> {
  const offer = await findOfferById(offerId);
  if (!offer) {
    throw new Error('Oferta não encontrada');
  }
  if (offer.sentAt) {
    throw new Error('Oferta já foi enviada — não pode ser removida');
  }

  if (isRedisEnabled()) {
    const queue = getSenderQueue();
    try {
      const job = await queue.getJob(`send-offer-${offerId}`);
      if (job) await job.remove();
    } catch (error) {
      logger.warn({ offerId, error }, 'Failed to remove sender job');
    } finally {
      await queue.close();
    }
  }

  const deleted = await deletePendingOfferById(offerId);
  if (deleted === 0) {
    throw new Error('Oferta não pôde ser removida (já foi enviada?)');
  }
  logger.info({ offerId }, 'Pending offer removed');
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
        attempts: 5,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  } finally {
    await queue.close();
  }
}
