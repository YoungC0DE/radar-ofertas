import { Worker } from 'bullmq';
import type { WASocket } from 'baileys';
import { env } from '../config/env.js';
import { formatOfferMessage } from '../offers/service.js';
import { findOfferById, markOfferSent } from '../offers/repository.js';
import { getQueueConnection, QUEUE_NAMES, type SenderJobData } from '../queue/index.js';
import { logger } from '../utils/logger.js';
import { sendOffer } from '../whatsapp/index.js';

export function startSenderWorker(sock: WASocket): Worker<SenderJobData> {
  const worker = new Worker<SenderJobData>(
    QUEUE_NAMES.OFFER_SENDER,
    async (job) => {
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

      const caption = formatOfferMessage(offer);
      await sendOffer(sock, env.WHATSAPP_CHANNEL_ID, offer.image, caption);
      await markOfferSent(offerId);

      logger.info({ offerId, title: offer.title }, 'Offer published');

      if (env.QUEUE_CONFIG.senderDelayMs > 0) {
        await new Promise((r) => setTimeout(r, env.QUEUE_CONFIG.senderDelayMs));
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
