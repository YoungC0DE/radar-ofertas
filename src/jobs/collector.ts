import { Worker } from 'bullmq';
import { searchConfiguredCategories } from '../mercado-livre/index.js';
import { processOffers } from '../offers/service.js';
import { getQueueConnection, QUEUE_NAMES, type CollectorJobData } from '../queue/index.js';
import { logger } from '../utils/logger.js';

export function startCollectorWorker(): Worker<CollectorJobData> {
  const worker = new Worker<CollectorJobData>(
    QUEUE_NAMES.OFFER_COLLECTOR,
    async (job) => {
      logger.info({ jobId: job.id }, 'Starting offer collection');

      const rawOffers = await searchConfiguredCategories();
      const enqueued = await processOffers(rawOffers);

      logger.info(
        { total: rawOffers.length, enqueued, triggeredAt: job.data.triggeredAt },
        'Offer collection completed',
      );

      return { total: rawOffers.length, enqueued };
    },
    { connection: getQueueConnection() },
  );

  worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, error }, 'Collector job failed');
  });

  return worker;
}
