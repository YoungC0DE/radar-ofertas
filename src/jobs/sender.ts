import { DelayedError, Worker } from 'bullmq';
import type { WASocket } from 'baileys';
import { env } from '../config/env.js';
import {
  getOperatingHoursStart,
  getOperatingHoursEnd,
  getSenderDelayMinutesCached,
  hydrateQueueConfigCache,
} from '../config/queue-config-store.js';
import { formatOfferMessage } from '../offers/service.js';
import { findOfferById, markOfferSent, updateOfferAffiliateLink } from '../offers/repository.js';
import { buildAffiliateLink } from '../mercado-livre/index.js';
import { getQueueConnection, QUEUE_NAMES, type SenderJobData } from '../queue/index.js';
import { isWithinOperatingHours, msUntilOperatingWindow } from '../utils/datetime.js';
import { logger } from '../utils/logger.js';
import { sendOffer } from '../whatsapp/index.js';

// Tempo máximo para gerar o link de afiliado no envio antes de cair no fallback,
// garantindo que uma sessão ML lenta nunca segure a fila de envio.
const AFFILIATE_LINK_SEND_TIMEOUT_MS = 10_000;

function getOperatingHours() {
  return {
    startHour: getOperatingHoursStart(),
    endHour: getOperatingHoursEnd(),
  };
}

export function startSenderWorker(sock: WASocket): Worker<SenderJobData> {
  const worker = new Worker<SenderJobData>(
    QUEUE_NAMES.OFFER_SENDER,
    async (job) => {
      await hydrateQueueConfigCache();
      const operatingHours = getOperatingHours();
      const force = job.data.force === true;

      if (!force && !isWithinOperatingHours(env.APP_TIMEZONE, operatingHours)) {
        const delayMs = msUntilOperatingWindow(env.APP_TIMEZONE, operatingHours);
        logger.info(
          {
            jobId: job.id,
            offerId: job.data.offerId,
            delayMs,
            timezone: env.APP_TIMEZONE,
            operatingHours,
          },
          'Outside operating hours — delaying WhatsApp send',
        );
        await job.moveToDelayed(Date.now() + delayMs);
        throw new DelayedError();
      }

      const { offerId } = job.data;

      const offer = await findOfferById(offerId);
      if (!offer) {
        logger.warn({ offerId }, 'Offer not found, skipping');
        return;
      }

      if (offer.sentAt) {
        logger.info({ offerId }, 'Offer already sent, skipping');
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
        logger.info({ offerId }, 'Affiliate link gerado sob demanda no envio');
      }

      const caption = await formatOfferMessage(offer);
      await sendOffer(sock, env.WHATSAPP_CHANNEL_ID, offer.image, caption);
      await markOfferSent(offerId);

      logger.info({ offerId, title: offer.title, force }, 'Offer published');

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
    logger.error({ jobId: job?.id, error }, 'Sender job failed');
  });

  return worker;
}
