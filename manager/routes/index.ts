import { createRouter, shutdownManager } from '../http/request.js';
import { managerRoutes } from '../http/routes/index.js';

export const handleManagerRequest = createRouter(managerRoutes);

export { shutdownManager };
