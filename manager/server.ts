import { startManagerServer, stopManagerServer } from './app.js';
import { logger } from '../src/utils/logger.js';

const server = startManagerServer();

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down manager');
  await stopManagerServer(server);
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
