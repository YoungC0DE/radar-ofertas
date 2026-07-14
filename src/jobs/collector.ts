import { Worker } from 'bullmq';
import { env } from '../config/env.js';
import { getOperatingHoursStart, getOperatingHoursEnd, hydrateQueueConfigCache } from '../config/queue-config-store.js';
import { collectNewOffers } from '../offers/service.js';
import { getQueueConnection, QUEUE_NAMES, type CollectorJobData } from '../queue/index.js';
import { isWithinOperatingHours } from '../utils/datetime.js';
import { logger } from '../utils/logger.js';

function getOperatingHours() {
  return {
    startHour: getOperatingHoursStart(),
    endHour: getOperatingHoursEnd(),
  };
}

export function startCollectorWorker(): Worker<CollectorJobData> {
  const worker = new Worker<CollectorJobData>(
    QUEUE_NAMES.OFFER_COLLECTOR,
    async (job) => {
      await hydrateQueueConfigCache();
      const operatingHours = getOperatingHours();

      if (!isWithinOperatingHours(env.APP_TIMEZONE, operatingHours)) {
        logger.info(
          {
            jobId: job.id,
            timezone: env.APP_TIMEZONE,
            operatingHours,
          },
          'Outside operating hours — skipping offer collection',
        );
        return { skipped: true, reason: 'outside_operating_hours' };
      }

      logger.info({ jobId: job.id }, 'Starting offer collection');

      const { total, enqueued } = await collectNewOffers();

      logger.info(
        { total, enqueued, triggeredAt: job.data.triggeredAt },
        'Offer collection completed',
      );

      return { total, enqueued };
    },
    { connection: getQueueConnection() },
  );

  worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, error }, 'Collector job failed');
  });

  return worker;
}
