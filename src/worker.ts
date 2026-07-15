import { startSenderWorker } from './jobs/sender.js';
import { hydrateQueueConfigCache } from './config/queue-config-store.js';
import { hydrateScoreConfigCache } from './config/score-config.js';
import { hydrateBrandCache } from './config/brand-config.js';
import { hydrateTemplateCache } from './offers/message-template.js';
import { logger } from './utils/logger.js';
import { connectWhatsApp, disconnectWhatsApp, isPlaceholderChannelId, setWhatsAppOwnerConflictHandler, validateWhatsAppChannel, WhatsAppOwnedElsewhereError } from './whatsapp/index.js';
import { env } from './config/env.js';

// Só pode existir UM worker dono da sessão do WhatsApp. Se, já em operação, a
// sessão for assumida por outro processo (connectionReplaced), encerramos este
// worker — não deve haver dois donos brigando pela conexão.
function exitOnOwnerConflict(): void {
  logger.error('WhatsApp já está sendo usado por outro processo — encerrando este worker duplicado.');
  process.exit(0);
}

async function main(): Promise<void> {
  logger.info('Starting sender worker process');

  setWhatsAppOwnerConflictHandler(exitOnOwnerConflict);

  await Promise.all([
    hydrateQueueConfigCache(),
    hydrateScoreConfigCache(),
    hydrateBrandCache(),
    hydrateTemplateCache(),
  ]);

  if (isPlaceholderChannelId(env.WHATSAPP_CHANNEL_ID)) {
    logger.error(
      { channelId: env.WHATSAPP_CHANNEL_ID },
      'WHATSAPP_CHANNEL_ID é placeholder — rode npm run wa:channel com o link do seu canal',
    );
    process.exit(1);
  }

  try {
    const sock = await connectWhatsApp();
    const channel = await validateWhatsAppChannel(sock, env.WHATSAPP_CHANNEL_ID);
    if (!channel.valid) {
      logger.error(
        { channelId: env.WHATSAPP_CHANNEL_ID, reason: channel.reason },
        'Canal WhatsApp inválido — rode npm run wa:channel para obter o JID correto',
      );
      process.exit(1);
    }
    logger.info({ channelId: env.WHATSAPP_CHANNEL_ID, name: channel.name }, 'Canal WhatsApp validado');
  } catch (error) {
    if (error instanceof WhatsAppOwnedElsewhereError) {
      // Já existe outro worker dono da sessão. Não subimos um segundo: encerramos
      // este processo duplicado para não brigar pela conexão.
      logger.error(
        'Já existe outro processo com a sessão do WhatsApp — encerrando este worker duplicado. Rode apenas UM worker.',
      );
      process.exit(0);
    }
    throw error;
  }

  const worker = startSenderWorker();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down sender worker');
    // Libera o lock de dono da sessão para que um restart rápido (painel / watch)
    // consiga reassumir o WhatsApp em vez de se ver como duplicado.
    await disconnectWhatsApp().catch(() => {});
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
