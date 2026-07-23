import { getEnabledChannels, isChannelEnabled } from '../channels/index.js';
import type { Channel } from '../channels/types.js';
import { findAccountsByPlatform } from '../accounts/repository.js';
import {
  getActiveMlCategoriesForChannel,
  getChannelsForCategory,
  hydrateMlSourcesCache,
} from '../config/ml-sources-config.js';
import { getSearchLimit } from '../config/queue-config-store.js';
import { calculateOfferScore, getRuntimeScoreConfig } from '../config/score-config.js';
import { iterateScrapedPages } from '../mercado-livre/index.js';
import {
  enqueueOfferSend,
  getSenderQueue,
  isRedisEnabled,
  SENDER_JOB_OPTIONS,
  senderJobId,
} from '../queue/index.js';
import { runWithConcurrency } from '../utils/concurrency.js';
import { logger } from '../utils/logger.js';
import { allocateProportionalWithMin, shuffle } from './sampling.js';
import { formatOfferMessageFromTemplate, loadMessageTemplate, loadPlaceholderVisibility } from './message-template.js';
import {
  createOffer,
  deletePendingOfferById,
  deletePendingOffers,
  findDelivery,
  findExistingDeliveryChannels,
  findOfferById,
  findOfferIdByMercadoLivreId,
  findPendingOfferIds,
  openOfferDelivery,
  sentOfferExistsByTitleAndPrice,
} from './repository.js';
import type { OfferRecord, RawOffer } from './types.js';

export interface ServiceDeps {
  getRuntimeScoreConfig: typeof getRuntimeScoreConfig;
  calculateOfferScore: typeof calculateOfferScore;
  getEnabledChannels: typeof getEnabledChannels;
  isChannelEnabled: typeof isChannelEnabled;
  getChannelsForCategory: typeof getChannelsForCategory;
  findOfferIdByMercadoLivreId: typeof findOfferIdByMercadoLivreId;
  findExistingDeliveryChannels: typeof findExistingDeliveryChannels;
  sentOfferExistsByTitleAndPrice: typeof sentOfferExistsByTitleAndPrice;
  createOffer: typeof createOffer;
  openOfferDelivery: typeof openOfferDelivery;
  enqueueOfferSend: typeof enqueueOfferSend;
  findAccountsByPlatform: typeof findAccountsByPlatform;
}

const defaultDeps: ServiceDeps = {
  getRuntimeScoreConfig,
  calculateOfferScore,
  getEnabledChannels,
  isChannelEnabled,
  getChannelsForCategory,
  findOfferIdByMercadoLivreId,
  findExistingDeliveryChannels,
  sentOfferExistsByTitleAndPrice,
  createOffer,
  openOfferDelivery,
  enqueueOfferSend,
  findAccountsByPlatform,
};

export async function formatOfferMessage(offer: OfferRecord): Promise<string> {
  const [template, visibility] = await Promise.all([
    loadMessageTemplate(),
    loadPlaceholderVisibility(),
  ]);
  return formatOfferMessageFromTemplate(template, offer, visibility);
}

export async function processOffer(rawOffer: RawOffer, deps: ServiceDeps = defaultDeps): Promise<string | null> {
  const scoreConfig = deps.getRuntimeScoreConfig();
  const score = deps.calculateOfferScore(rawOffer);

  if (score < scoreConfig.minScore) {
    logger.debug({ mercadoLivreId: rawOffer.mercadoLivreId, score }, 'Below min score');
    return null;
  }

  const targetChannels = resolveOfferChannels(rawOffer, deps);
  if (targetChannels.length === 0) {
    return null;
  }

  const existingId = await deps.findOfferIdByMercadoLivreId(rawOffer.mercadoLivreId);
  if (existingId) {
    const already = await deps.findExistingDeliveryChannels(existingId);
    const missing = targetChannels.filter((channel) => !already.includes(channel));
    if (missing.length === 0) {
      logger.debug({ mercadoLivreId: rawOffer.mercadoLivreId }, 'Offer already dispatched to its channels');
      return null;
    }
    await dispatchOffer(existingId, missing, deps);
    logger.info({ offerId: existingId, channels: missing }, 'Existing offer dispatched to missing channels');
    return existingId;
  }

  if (await deps.sentOfferExistsByTitleAndPrice(rawOffer.title, rawOffer.price)) {
    logger.debug({ title: rawOffer.title, price: rawOffer.price }, 'Duplicate sent offer (same title+price)');
    return null;
  }

  // Não geramos o link de afiliado aqui. Guardamos o permalink e deixamos o link
  // nulo — ele é gerado sob demanda na hora do envio (sender), evitando chamadas
  // ao ML para ofertas que talvez nunca sejam enviadas.
  const offer = await deps.createOffer({
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

  const channels = await dispatchOffer(offer.id, targetChannels, deps);

  logger.info({ offerId: offer.id, score: offer.score, channels }, 'Offer saved and enqueued');
  return offer.id;
}

function resolveOfferChannels(rawOffer: RawOffer, deps: ServiceDeps = defaultDeps): Channel[] {
  const enabled = deps.getEnabledChannels();
  if (!rawOffer.sourceCategory) return enabled;
  const sourceChannels = deps.getChannelsForCategory(rawOffer.sourceCategory);
  return enabled.filter((channel) => sourceChannels.includes(channel));
}

/**
 * Fan-out da oferta para os canais indicados (default: todos os ligados). Abrimos
 * a entrega ANTES de enfileirar: se o processo morrer entre as duas coisas, a
 * oferta aparece como pendente no painel em vez de sumir sem rastro.
 *
 * Cada canal falha por conta própria — um Redis recusando o job do Telegram não
 * pode impedir o WhatsApp de receber o seu.
 */
export async function dispatchOffer(offerId: string, channels?: Channel[], deps: ServiceDeps = defaultDeps): Promise<Channel[]> {
  const targets = (channels ?? deps.getEnabledChannels()).filter((channel) => deps.isChannelEnabled(channel));
  const dispatched: Channel[] = [];

  for (const channel of targets) {
    const accounts = await deps.findAccountsByPlatform(channel);
    const accountIds = accounts.length > 0
      ? accounts.map((a) => a.id)
      : ['default'];

    for (const accountId of accountIds) {
      try {
        await deps.openOfferDelivery(offerId, channel, accountId);
        await deps.enqueueOfferSend(channel, offerId, accountId);
        if (!dispatched.includes(channel)) dispatched.push(channel);
      } catch (error) {
        logger.error({ offerId, channel, accountId, error }, 'Falha ao enfileirar envio do canal');
      }
    }
  }

  return dispatched;
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
    // Marcamos a fonte em cada oferta para o dispatch saber a quais canais ela
    // pertence, mesmo depois de os pools serem embaralhados juntos no sorteio.
    for (const offer of page) offer.sourceCategory = category;
    pool.push(...page);
    if (++pages >= POOL_PAGES_PER_SOURCE) break;
  }

  return pool;
}

/**
 * Coleta independente por canal: cada canal ligado puxa até seu próprio
 * searchLimit a partir das SUAS fontes. Assim "Telegram = /ofertas" recebe a cota
 * cheia mesmo que o WhatsApp tenha muitas fontes — antes uma cota global era
 * repartida entre as fontes de todos os canais e o canal com menos fontes ficava
 * sub-representado.
 *
 * Uma oferta de fonte compartilhada é criada uma vez e entregue nos dois canais;
 * na passada do segundo canal, processOffer vê que as entregas já existem e não a
 * reconta (ver dedup por canal em processOffer).
 */
export async function collectNewOffers(): Promise<{ total: number; enqueued: number }> {
  await hydrateMlSourcesCache();
  const target = getSearchLimit();
  const channels = getEnabledChannels();

  let total = 0;
  let enqueued = 0;

  for (const channel of channels) {
    const result = await collectForChannel(channel, target);
    total += result.total;
    enqueued += result.enqueued;
  }

  return { total, enqueued };
}

async function collectForChannel(
  channel: Channel,
  target: number,
): Promise<{ total: number; enqueued: number }> {
  const categories = getActiveMlCategoriesForChannel(channel);
  if (categories.length === 0) {
    logger.info({ channel }, 'Nenhuma fonte ativa para o canal — nada a coletar');
    return { total: 0, enqueued: 0 };
  }

  // Buscamos o pool de todas as fontes do canal ANTES de processar, para o
  // sorteio ver todas — senão a primeira fonte encheria a cota e as demais nunca
  // seriam lidas.
  const pools = await runWithConcurrency(categories, POOL_CONCURRENCY, async (category) => {
    try {
      return { category, offers: shuffle(await collectPool(category)) };
    } catch (error) {
      logger.error({ channel, category, error }, 'Failed to build pool for source');
      return { category, offers: [] as RawOffer[] };
    }
  });

  const filled = shuffle(pools.filter((pool) => pool.offers.length > 0));
  if (filled.length === 0) {
    logger.warn({ channel, sources: categories.length }, 'All sources returned empty for channel');
    return { total: 0, enqueued: 0 };
  }

  const quotas = allocateProportionalWithMin(filled.map((pool) => pool.offers.length), target);

  logger.info(
    {
      channel,
      target,
      sources: filled.map((pool, index) => ({
        category: pool.category,
        pool: pool.offers.length,
        quota: quotas[index] ?? 0,
      })),
    },
    'Offer pools built for channel — drawing',
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

/** Remove os jobs de envio de uma oferta em todos os canais ligados. */
async function removeSenderJobs(offerIds: string[]): Promise<void> {
  if (!isRedisEnabled() || offerIds.length === 0) return;

  for (const channel of getEnabledChannels()) {
    const queue = getSenderQueue(channel);
    try {
      for (const offerId of offerIds) {
        try {
          const job = await queue.getJob(senderJobId(channel, offerId));
          if (job) await job.remove();
        } catch (error) {
          logger.warn({ offerId, channel, error }, 'Failed to remove sender job');
        }
      }
    } finally {
      await queue.close();
    }
  }
}

export async function removeAllPendingOffers(): Promise<number> {
  const ids = await findPendingOfferIds();
  if (ids.length === 0) return 0;

  await removeSenderJobs(ids);

  // As entregas somem junto por cascade (OfferDelivery.offer onDelete: Cascade).
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

  await removeSenderJobs([offerId]);

  const deleted = await deletePendingOfferById(offerId);
  if (deleted === 0) {
    throw new Error('Oferta não pôde ser removida (já foi enviada?)');
  }
  logger.info({ offerId }, 'Pending offer removed');
}

/**
 * Enfileira o envio imediato (force: pula a janela operacional e o delay).
 * Sem canal, dispara em todos os ligados que ainda não receberam a oferta.
 */
export async function sendOfferNow(offerId: string, channel?: Channel): Promise<void> {
  const offer = await findOfferById(offerId);
  if (!offer) {
    throw new Error('Oferta não encontrada');
  }
  if (!isRedisEnabled()) {
    throw new Error('Redis desabilitado — não é possível enfileirar envio');
  }

  const targets = channel ? [channel] : getEnabledChannels();
  if (targets.length === 0) {
    throw new Error('Nenhum canal habilitado — ligue o WhatsApp ou o Telegram');
  }

  const pending: Channel[] = [];
  for (const target of targets) {
    const delivery = await findDelivery(offerId, target);
    if (!delivery?.sentAt) pending.push(target);
  }

  if (pending.length === 0) {
    throw new Error(
      channel ? 'Oferta já foi enviada neste canal' : 'Oferta já foi enviada em todos os canais',
    );
  }

  for (const target of pending) {
    await openOfferDelivery(offerId, target);
    const queue = getSenderQueue(target);
    const jobId = senderJobId(target, offerId);

    try {
      const existing = await queue.getJob(jobId);
      if (existing) {
        const state = await existing.getState();
        // Um job já rodando vai concluir sozinho — removê-lo agora perderia o envio.
        if (state === 'active') continue;
        await existing.remove();
      }

      await queue.add('send', { offerId, force: true }, { jobId, priority: 1, ...SENDER_JOB_OPTIONS });
    } finally {
      await queue.close();
    }
  }
}
