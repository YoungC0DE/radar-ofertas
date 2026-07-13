import { Queue } from 'bullmq';
import { getRuntimeQueueConfig } from '../config/queue-config-store.js';
import { env } from '../config/env.js';

export const QUEUE_NAMES = {
  OFFER_COLLECTOR: 'offer-collector',
  OFFER_SENDER: 'offer-sender',
} as const;

export interface CollectorJobData {
  triggeredAt: string;
}

export interface SenderJobData {
  offerId: string;
}

const connection = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: null as null,
};

export function isRedisEnabled(): boolean {
  return env.REDIS_ENABLED;
}

function assertRedisEnabled(feature: string): void {
  if (!env.REDIS_ENABLED) {
    throw new Error(`Redis desabilitado (REDIS_ENABLED=false) — necessário para ${feature}`);
  }
}

export function getCollectorQueue(): Queue<CollectorJobData> {
  assertRedisEnabled('filas de coleta');
  return new Queue<CollectorJobData>(QUEUE_NAMES.OFFER_COLLECTOR, { connection });
}

export function getSenderQueue(): Queue<SenderJobData> {
  assertRedisEnabled('filas de envio');
  return new Queue<SenderJobData>(QUEUE_NAMES.OFFER_SENDER, { connection });
}

export async function scheduleCollectorJob(): Promise<void> {
  assertRedisEnabled('agendamento do collector');
  const queue = getCollectorQueue();
  const config = getRuntimeQueueConfig();
  const intervalMs = config.collectorIntervalMinutes * 60 * 1000;

  await queue.add(
    'collect',
    { triggeredAt: new Date().toISOString() },
    {
      repeat: { every: intervalMs },
      jobId: 'offer-collector-repeat',
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  );
}

export async function rescheduleCollectorJob(): Promise<void> {
  assertRedisEnabled('reagendamento do collector');
  const queue = getCollectorQueue();
  const repeatables = await queue.getRepeatableJobs();

  for (const job of repeatables) {
    if (job.id === 'offer-collector-repeat' || job.name === 'collect') {
      await queue.removeRepeatableByKey(job.key);
    }
  }

  await scheduleCollectorJob();
}

export async function enqueueOfferSend(offerId: string): Promise<void> {
  assertRedisEnabled('enfileiramento de envio');
  await getSenderQueue().add(
    'send',
    { offerId },
    {
      jobId: `send-offer-${offerId}`,
      removeOnComplete: true,
      removeOnFail: 100,
    },
  );
}

export function getQueueConnection() {
  return connection;
}
