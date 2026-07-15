import { Queue } from 'bullmq';
import { getCollectorIntervalMinutes } from '../config/queue-config-store.js';
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
  force?: boolean;
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
  const intervalMs = getCollectorIntervalMinutes() * 60 * 1000;

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

export async function enqueueOfferCollection(): Promise<void> {
  assertRedisEnabled('enfileiramento de coleta');
  await getCollectorQueue().add(
    'collect',
    { triggeredAt: new Date().toISOString() },
    {
      removeOnComplete: true,
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
      // Sem retry, uma queda momentânea do WhatsApp (reconexão/cooldown) derrubava
      // o envio de vez. Com backoff exponencial o envio é retentado ao longo de
      // ~8 min, tempo de sobra para a sessão religar.
      attempts: 5,
      backoff: { type: 'exponential', delay: 30_000 },
      removeOnComplete: true,
      removeOnFail: 100,
    },
  );
}

export function getQueueConnection() {
  return connection;
}
