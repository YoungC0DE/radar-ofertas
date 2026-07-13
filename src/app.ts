import { hydrateQueueConfigCache } from './config/queue-config-store.js';
import { hydrateScoreConfigCache } from './config/score-config.js';
import { hydrateBrandCache } from './config/brand-config.js';
import { scheduleCollectorJob } from './queue/index.js';
import { startCollectorWorker } from './jobs/collector.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  logger.info('Starting collector process');

  await Promise.all([hydrateQueueConfigCache(), hydrateScoreConfigCache(), hydrateBrandCache()]);
  await scheduleCollectorJob();
  const worker = startCollectorWorker();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down collector');
    await worker.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  logger.error({ error }, 'Collector process failed');
  process.exit(1);
});
