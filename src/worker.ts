import { whatsappPublisher } from './channels/whatsapp-publisher.js';
import { runChannelWorker } from './channels/worker-runner.js';
import { logger } from './utils/logger.js';
import { setWhatsAppOwnerConflictHandler } from './whatsapp/index.js';

// Só pode existir UM worker dono da sessão do WhatsApp. Se, já em operação, a
// sessão for assumida por outro processo (connectionReplaced), encerramos este
// worker — não deve haver dois donos brigando pela conexão.
function exitOnOwnerConflict(): void {
  logger.error('WhatsApp já está sendo usado por outro processo — encerrando este worker duplicado.');
  process.exit(0);
}

setWhatsAppOwnerConflictHandler(exitOnOwnerConflict);

runChannelWorker(whatsappPublisher).catch((error) => {
  logger.error({ error }, 'WhatsApp sender worker process failed');
  process.exit(1);
});
