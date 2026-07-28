import type { FastifyReply, FastifyRequest } from 'fastify';

import { handleCollectOffers, loadDashboardData } from '../../manager/models/dashboard-model.js';
import { getMetrics } from '../../src/utils/metrics.js';
import { ValidationError } from '../errors/api-errors.js';
import { serializeDashboard } from '../serializers/dashboard.serializer.js';

export async function getDashboardHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const data = await loadDashboardData();
  reply.status(200).send(serializeDashboard(data));
}

export async function collectOffersHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const result = await handleCollectOffers();
  if ('error' in result) {
    throw new ValidationError(result.error);
  }
  reply.status(202).send({ queued: true });
}

export async function getMetricsHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  reply.status(200).send(await getMetrics());
}
