import { telegramPublisher } from './channels/telegram-publisher.js';
import { runChannelWorker } from './channels/worker-runner.js';
import { logger } from './utils/logger.js';

// Processo dedicado ao envio no Telegram. Diferente do WhatsApp, a Bot API é
// stateless: não há sessão nem lock de dono, então rodar mais de uma réplica é
// seguro — o job id determinístico por canal já garante um envio por oferta.
runChannelWorker(telegramPublisher).catch((error) => {
  logger.error({ error }, 'Telegram sender worker process failed');
  process.exit(1);
});
