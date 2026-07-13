import { DelayedError, Worker } from 'bullmq';
import type { WASocket } from 'baileys';
import { env } from '../config/env.js';
import { formatOfferMessage } from '../offers/service.js';
import { findOfferById, markOfferSent } from '../offers/repository.js';
import { getQueueConnection, QUEUE_NAMES, type SenderJobData } from '../queue/index.js';
import { isWithinOperatingHours, msUntilOperatingWindow } from '../utils/datetime.js';
import { logger } from '../utils/logger.js';
import { sendOffer } from '../whatsapp/index.js';

function getOperatingHours() {
  return {
    startHour: env.QUEUE_CONFIG.operatingHoursStart,
    endHour: env.QUEUE_CONFIG.operatingHoursEnd,
  };
}

export function startSenderWorker(sock: WASocket): Worker<SenderJobData> {
  const worker = new Worker<SenderJobData>(
    QUEUE_NAMES.OFFER_SENDER,
    async (job) => {
      const operatingHours = getOperatingHours();

      if (!isWithinOperatingHours(env.APP_TIMEZONE, operatingHours)) {
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

      const caption = formatOfferMessage(offer);
      await sendOffer(sock, env.WHATSAPP_CHANNEL_ID, offer.image, caption);
      await markOfferSent(offerId);

      logger.info({ offerId, title: offer.title }, 'Offer published');

      const senderDelayMs = env.QUEUE_CONFIG.senderDelayMinutes * 60 * 1000;
      if (senderDelayMs > 0) {
        await new Promise((r) => setTimeout(r, senderDelayMs));
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
