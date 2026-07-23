import { loadWorkerPublisher } from './accounts/worker-publisher.js';
import { runChannelWorker } from './channels/worker-runner.js';
import { logger } from './utils/logger.js';
import { setWhatsAppOwnerConflictHandler } from './whatsapp/index.js';

function exitOnOwnerConflict(): void {
  logger.error('WhatsApp já está sendo usado por outro processo — encerrando este worker duplicado.');
  process.exit(0);
}

setWhatsAppOwnerConflictHandler(exitOnOwnerConflict);

loadWorkerPublisher('whatsapp')
  .then((publisher) => runChannelWorker(publisher))
  .catch((error) => {
    logger.error({ error }, 'WhatsApp sender worker process failed');
    process.exit(1);
  });
