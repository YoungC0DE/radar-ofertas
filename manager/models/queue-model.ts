import { getCollectorQueue, getSenderQueue, isRedisEnabled } from '../../src/queue/index.js';
import { logger } from '../../src/utils/logger.js';
export interface QueueCounts {
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  completed: number;
}

export interface QueuesSnapshot {
  available: boolean;
  error?: string;
  collector: QueueCounts;
  sender: QueueCounts;
}

const emptyCounts = (): QueueCounts => ({
  waiting: 0,
  active: 0,
  delayed: 0,
  failed: 0,
  completed: 0,
});

async function readCounts(
  queue: ReturnType<typeof getCollectorQueue>,
): Promise<QueueCounts> {
  const counts = await queue.getJobCounts('waiting', 'active', 'delayed', 'failed', 'completed');
  return {
    waiting: counts.waiting ?? 0,
    active: counts.active ?? 0,
    delayed: counts.delayed ?? 0,
    failed: counts.failed ?? 0,
    completed: counts.completed ?? 0,
  };
}

export async function getQueuesSnapshot(): Promise<QueuesSnapshot> {
  if (!isRedisEnabled()) {
    return {
      available: false,
      error: 'Redis desabilitado (REDIS_ENABLED=false)',
      collector: emptyCounts(),
      sender: emptyCounts(),
    };
  }

  try {    const [collector, sender] = await Promise.all([
      readCounts(getCollectorQueue()),
      readCounts(getSenderQueue()),
    ]);
    return { available: true, collector, sender };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn({ error }, 'Redis indisponível — filas não carregadas no manager');
    return {
      available: false,
      error: message,
      collector: emptyCounts(),
      sender: emptyCounts(),
    };
  }
}