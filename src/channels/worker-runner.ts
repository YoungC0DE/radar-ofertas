import { hydrateBrandCache } from '../config/brand-config.js';
import { hydrateQueueConfigCache } from '../config/queue-config-store.js';
import { hydrateScoreConfigCache } from '../config/score-config.js';
import { startSenderWorker } from '../jobs/sender.js';
import { hydrateCouponTemplateCache } from '../offers/coupon-template.js';
import { hydrateTemplateCache } from '../offers/message-template.js';
import { logger } from '../utils/logger.js';
import { CHANNEL_LABELS, type ChannelPublisher } from './types.js';

/**
 * Boot compartilhado dos workers de envio: hidrata os caches de config, valida o
 * canal e sobe o worker da fila daquele canal. Cada canal roda no seu processo,
 * então uma falha do WhatsApp não derruba o Telegram nem vice-versa.
 */
export async function runChannelWorker(publisher: ChannelPublisher): Promise<void> {
  const { channel } = publisher;
  const label = CHANNEL_LABELS[channel];

  logger.info({ channel }, `Starting ${label} sender worker process`);

  if (!publisher.isEnabled()) {
    logger.warn({ channel }, `${label} está desabilitado no .env — encerrando este worker`);
    process.exit(0);
  }

  await Promise.all([
    hydrateQueueConfigCache(),
    hydrateScoreConfigCache(),
    hydrateBrandCache(),
    hydrateTemplateCache(),
    hydrateCouponTemplateCache(),
  ]);

  const verification = await publisher.verify();

  if (!verification.ok) {
    if (verification.duplicate) {
      // Outro processo já é dono da conexão. Não é erro de config: encerramos em
      // silêncio para o Docker não reiniciar em loop.
      logger.error({ channel }, `${label}: ${verification.detail} — encerrando este worker duplicado.`);
      process.exit(0);
    }

    logger.error({ channel }, `${label} não pôde ser verificado: ${verification.detail}`);
    process.exit(1);
  }

  logger.info({ channel }, `${label} verificado — ${verification.detail}`);

  const worker = startSenderWorker(publisher);

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ channel, signal }, `Shutting down ${label} sender worker`);
    await publisher.shutdown?.().catch(() => {});
    await worker.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}
