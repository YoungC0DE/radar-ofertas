import { createServer, type Server } from 'node:http';

import { env } from '../src/config/env.js';
import { bootstrapCacheCoherence } from '../src/utils/config-cache-sync.js';
import { hydrateIntegrationState } from '../src/channels/integration-state.js';
import { logger } from '../src/utils/logger.js';
import { startDevLiveReload, stopDevLiveReload } from './dev/live-reload.js';
import { createRouter, shutdownManager } from './http/request.js';
import { managerRoutes } from './http/routes/index.js';

const handleManagerRequest = createRouter(managerRoutes);

export function startManagerServer(): Server {
  const server = createServer((req, res) => {
    void handleManagerRequest(req, res);
  });

  server.listen(env.MANAGER_PORT, () => {
    logger.info({ port: env.MANAGER_PORT }, 'Manager disponível em /manager');
    startDevLiveReload();
    void bootstrapCacheCoherence();
    void hydrateIntegrationState();
  });

  return server;
}

export async function stopManagerServer(server: Server): Promise<void> {
  stopDevLiveReload();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await shutdownManager();
}
