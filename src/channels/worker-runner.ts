import { hydrateBrandCache } from '../config/brand-config.js';
import { hydrateQueueConfigCache } from '../config/queue-config-store.js';
import { hydrateScoreConfigCache } from '../config/score-config.js';
import { startSenderWorker } from '../jobs/sender.js';
import { hydrateCouponTemplateCache } from '../offers/coupon-template.js';
import { hydrateTemplateCache } from '../offers/message-template.js';
import { closeAllQueues } from '../queue/index.js';
import { logger } from '../utils/logger.js';
import { startWorkerHeartbeatLoop } from '../utils/redis-state.js';
import { bootstrapCacheCoherence } from '../utils/config-cache-sync.js';
import { CHANNEL_LABELS, type ChannelPublisher } from './types.js';
/**
 * Boot compartilhado dos workers de envio: hidrata os caches de config, valida o
 * canal e sobe o worker da fila daquele canal. Cada canal roda no seu processo,
 * então uma falha do WhatsApp não derruba o Telegram nem vice-versa.
 */
export async function runChannelWorker(publisher: ChannelPublisher): Promise<void> {
  const { channel, accountId } = publisher;
  const label = CHANNEL_LABELS[channel];

  logger.info({ channel, accountId }, `Starting ${label} sender worker process`);

  if (!publisher.isEnabled()) {
    logger.warn({ channel, accountId }, `${label} está desabilitado — encerrando este worker`);
    process.exit(0);
  }

  await Promise.all([
    hydrateQueueConfigCache(),
    hydrateScoreConfigCache(),
    hydrateBrandCache(),
    hydrateTemplateCache(),
    hydrateCouponTemplateCache(),
    bootstrapCacheCoherence(),
  ]);

  const verification = await publisher.verify();

  if (!verification.ok) {
    if (verification.duplicate) {
      // Outro processo já é dono da conexão. Não é erro de config: encerramos em
      // silêncio para o Docker não reiniciar em loop.
      logger.error({ channel, accountId }, `${label}: ${verification.detail} — encerrando este worker duplicado.`);
      process.exit(0);
    }

    logger.error({ channel, accountId }, `${label} não pôde ser verificado: ${verification.detail}`);
    process.exit(1);
  }

  logger.info({ channel, accountId }, `${label} verificado — ${verification.detail}`);

  const startedAt = new Date().toISOString();
  const stopHeartbeat = startWorkerHeartbeatLoop(channel, accountId, startedAt);
  const worker = startSenderWorker(publisher);

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ channel, accountId, signal }, `Shutting down ${label} sender worker`);
    stopHeartbeat();
    await publisher.shutdown?.().catch(() => {});    await worker.close();
    await closeAllQueues();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}
