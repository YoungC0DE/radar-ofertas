import { DelayedError, Worker } from 'bullmq';
import type { ChannelPublisher } from '../channels/types.js';
import { env } from '../config/env.js';
import {
  getOperatingHoursStart,
  getOperatingHoursEnd,
  getSenderDelayMinutesCached,
  hydrateQueueConfigCache,
} from '../config/queue-config-store.js';
import { formatOfferMessage } from '../offers/service.js';
import {
  findDelivery,
  findOfferById,
  markOfferDelivered,
  markOfferDeliveryFailed,
  updateOfferAffiliateLink,
} from '../offers/repository.js';
import { buildAffiliateLink } from '../mercado-livre/index.js';
import { getQueueConnection, getSenderQueueName, type SenderJobData } from '../queue/index.js';
import { isWithinOperatingHours, msUntilOperatingWindow } from '../utils/datetime.js';
import { logger } from '../utils/logger.js';

// Tempo máximo para gerar o link de afiliado no envio antes de cair no fallback,
// garantindo que uma sessão ML lenta nunca segure a fila de envio.
const AFFILIATE_LINK_SEND_TIMEOUT_MS = 10_000;

function getOperatingHours() {
  return {
    startHour: getOperatingHoursStart(),
    endHour: getOperatingHoursEnd(),
  };
}

/**
 * Worker de envio de um canal. Cada canal roda o seu, contra a sua própria fila:
 * o publisher é a única parte específica do canal.
 */
export function startSenderWorker(publisher: ChannelPublisher): Worker<SenderJobData> {
  const { channel } = publisher;

  const worker = new Worker<SenderJobData>(
    getSenderQueueName(channel),
    async (job) => {
      await hydrateQueueConfigCache();
      const operatingHours = getOperatingHours();
      const force = job.data.force === true;

      if (!force && !isWithinOperatingHours(env.APP_TIMEZONE, operatingHours)) {
        const delayMs = msUntilOperatingWindow(env.APP_TIMEZONE, operatingHours);
        logger.info(
          {
            channel,
            jobId: job.id,
            offerId: job.data.offerId,
            delayMs,
            timezone: env.APP_TIMEZONE,
            operatingHours,
          },
          'Outside operating hours — delaying send',
        );
        await job.moveToDelayed(Date.now() + delayMs);
        throw new DelayedError();
      }

      const { offerId } = job.data;

      const offer = await findOfferById(offerId);
      if (!offer) {
        logger.warn({ channel, offerId }, 'Offer not found, skipping');
        return;
      }

      // O estado por canal vem da entrega, não de Offer.sentAt: uma oferta já
      // publicada no WhatsApp continua pendente para o Telegram.
      const delivery = await findDelivery(offerId, channel);
      if (delivery?.sentAt) {
        logger.info({ channel, offerId }, 'Offer already sent to this channel, skipping');
        return;
      }

      // Geração sob demanda: só chamamos o ML para criar o link de afiliado no
      // momento do envio, e apenas se a oferta ainda não tiver um link salvo.
      // Guarda-corpos para nunca travar a fila: timeout curto (cai no fallback)
      // e sem abrir Chromium dentro do caminho de envio.
      if (!offer.affiliateLink && offer.permalink) {
        const affiliateLink = await buildAffiliateLink(offer.permalink, offer.mercadoLivreId, undefined, {
          allowBrowser: false,
          timeoutMs: AFFILIATE_LINK_SEND_TIMEOUT_MS,
        });
        await updateOfferAffiliateLink(offerId, affiliateLink);
        offer.affiliateLink = affiliateLink;
        logger.info({ channel, offerId }, 'Affiliate link gerado sob demanda no envio');
      }

      const caption = await formatOfferMessage(offer);

      try {
        const { messageId } = await publisher.publish(offer, caption);
        await markOfferDelivered(offerId, channel, messageId);
      } catch (error) {
        // Guardamos o motivo antes de repropagar: o BullMQ ainda vai retentar,
        // mas o painel precisa saber por que este canal está travado.
        const message = error instanceof Error ? error.message : String(error);
        await markOfferDeliveryFailed(offerId, channel, message).catch(() => {});
        throw error;
      }

      logger.info({ channel, offerId, title: offer.title, force }, 'Offer published');

      if (!force) {
        const delayMs = getSenderDelayMinutesCached() * 60 * 1000;
        if (delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    },
    {
      connection: getQueueConnection(),
      concurrency: env.QUEUE_CONFIG.senderConcurrency,
    },
  );

  worker.on('failed', (job, error) => {
    logger.error({ channel, jobId: job?.id, error }, 'Sender job failed');
  });

  return worker;
}
