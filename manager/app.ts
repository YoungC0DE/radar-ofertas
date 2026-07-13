import { createServer, type Server } from 'node:http';

import { env } from '../src/config/env.js';
import { logger } from '../src/utils/logger.js';
import { handleManagerRequest, shutdownManager } from './routes/index.js';

export function startManagerServer(): Server {
  const server = createServer((req, res) => {
    void handleManagerRequest(req, res);
  });

  server.listen(env.MANAGER_PORT, () => {
    logger.info({ port: env.MANAGER_PORT }, 'Manager disponível em /manager');
  });

  return server;
}

export async function stopManagerServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await shutdownManager();
}
