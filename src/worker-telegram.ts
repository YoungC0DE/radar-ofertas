import { loadWorkerPublisher } from './accounts/worker-publisher.js';
import { runChannelWorker } from './channels/worker-runner.js';
import { logger } from './utils/logger.js';

loadWorkerPublisher('telegram')
  .then((publisher) => runChannelWorker(publisher))
  .catch((error) => {
    logger.error({ error }, 'Telegram sender worker process failed');
    process.exit(1);
  });
