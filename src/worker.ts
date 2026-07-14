import { startSenderWorker } from './jobs/sender.js';
import { hydrateQueueConfigCache } from './config/queue-config-store.js';
import { hydrateScoreConfigCache } from './config/score-config.js';
import { hydrateBrandCache } from './config/brand-config.js';
import { hydrateTemplateCache } from './offers/message-template.js';
import { logger } from './utils/logger.js';
import { connectWhatsApp, isPlaceholderChannelId, validateWhatsAppChannel } from './whatsapp/index.js';
import { env } from './config/env.js';

async function main(): Promise<void> {
  logger.info('Starting sender worker process');

  await Promise.all([
    hydrateQueueConfigCache(),
    hydrateScoreConfigCache(),
    hydrateBrandCache(),
    hydrateTemplateCache(),
  ]);

  const sock = await connectWhatsApp();

  if (isPlaceholderChannelId(env.WHATSAPP_CHANNEL_ID)) {
    logger.error(
      { channelId: env.WHATSAPP_CHANNEL_ID },
      'WHATSAPP_CHANNEL_ID é placeholder — rode npm run wa:channel com o link do seu canal',
    );
    process.exit(1);
  }

  const channel = await validateWhatsAppChannel(sock, env.WHATSAPP_CHANNEL_ID);
  if (!channel.valid) {
    logger.error(
      { channelId: env.WHATSAPP_CHANNEL_ID, reason: channel.reason },
      'Canal WhatsApp inválido — rode npm run wa:channel para obter o JID correto',
    );
    process.exit(1);
  }

  logger.info({ channelId: env.WHATSAPP_CHANNEL_ID, name: channel.name }, 'Canal WhatsApp validado');
  const worker = startSenderWorker(sock);

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down sender worker');
    await worker.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  logger.error({ error }, 'Sender worker process failed');
  process.exit(1);
});
