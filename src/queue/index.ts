import { Queue } from 'bullmq';
import { getEnabledAccountIdsForChannel } from '../accounts/channel-accounts.js';
import { getCollectorIntervalMinutes } from '../config/queue-config-store.js';
import { categoryJobKey } from '../config/ml-sources-config.js';
import { env } from '../config/env.js';
import { CHANNELS, isChannelEnabled } from '../channels/index.js';
import type { Channel } from '../channels/types.js';

export const QUEUE_NAMES = {
  OFFER_COLLECTOR: 'offer-collector',
  OFFER_SENDER: 'offer-sender',
} as const;

/**
 * Uma fila por canal: cada worker tem seu próprio ritmo, sua janela e suas
 * falhas isoladas — se o WhatsApp cai, o Telegram continua publicando. O nome da
 * fila do WhatsApp é o histórico ('offer-sender') para não órfãos os jobs em voo
 * no deploy desta mudança.
 */
const SENDER_QUEUE_NAMES: Record<Channel, string> = {
  whatsapp: QUEUE_NAMES.OFFER_SENDER,
  telegram: 'offer-sender-telegram',
};

export function getSenderQueueName(channel: Channel, accountId = 'default'): string {
  if (accountId === 'default') return SENDER_QUEUE_NAMES[channel];
  return `${SENDER_QUEUE_NAMES[channel]}-${accountId}`;
}

export interface CollectorOrchestrateJobData {
  kind: 'orchestrate';
  triggeredAt: string;
}

export interface CollectorSourceJobData {
  kind: 'source';
  triggeredAt: string;
  channel: Channel;
  category: string;
  quota: number;
}

export type CollectorJobData = CollectorOrchestrateJobData | CollectorSourceJobData;

export function collectorSourceJobId(
  channel: Channel,
  category: string,
  triggeredAt: string,
): string {
  return `collect-source-${channel}-${categoryJobKey(category)}-${triggeredAt}`;
}

export interface SenderJobData {
  offerId?: string;
  autoMessageId?: string;
  text?: string;
  force?: boolean;
  accountId?: string;
}

/** Job id determinístico: garante um envio por oferta por canal por conta. */
export function senderJobId(channel: Channel, offerId: string, accountId = 'default'): string {
  if (accountId === 'default') return `send-offer-${channel}-${offerId}`;
  return `send-offer-${channel}-${accountId}-${offerId}`;
}

export function autoMessageJobId(channel: Channel, autoMessageId: string, suffix = 'now'): string {
  return `send-auto-message-${channel}-${autoMessageId}-${suffix}`;
}

export function textMessageJobId(channel: Channel, suffix: string): string {
  return `send-text-${channel}-${suffix}`;
}

const connection = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: null as null,
};

/** Instâncias reutilizadas por nome — evita abrir/fechar conexão Redis a cada enqueue. */
const queueCache = new Map<string, Queue>();

function getQueue<T>(name: string): Queue<T> {
  const existing = queueCache.get(name);
  if (existing) {
    return existing as Queue<T>;
  }

  const queue = new Queue<T>(name, { connection });
  queueCache.set(name, queue);
  return queue;
}

export async function closeAllQueues(): Promise<void> {
  await Promise.all([...queueCache.values()].map((queue) => queue.close()));
  queueCache.clear();
}

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
  return getQueue<CollectorJobData>(QUEUE_NAMES.OFFER_COLLECTOR);
}

export function getSenderQueue(channel: Channel, accountId = 'default'): Queue<SenderJobData> {
  assertRedisEnabled('filas de envio');
  return getQueue<SenderJobData>(getSenderQueueName(channel, accountId));
}

export async function scheduleCollectorJob(): Promise<void> {
  assertRedisEnabled('agendamento do collector');
  const queue = getCollectorQueue();
  const intervalMs = getCollectorIntervalMinutes() * 60 * 1000;

  await queue.add(
    'collect-orchestrate',
    { kind: 'orchestrate', triggeredAt: new Date().toISOString() },
    {
      repeat: { every: intervalMs },
      jobId: 'offer-collector-repeat',
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  );
}

export async function enqueueCollectSourceJob(data: CollectorSourceJobData): Promise<void> {
  assertRedisEnabled('enfileiramento de coleta por fonte');
  await getCollectorQueue().add('collect-source', data, {
    jobId: collectorSourceJobId(data.channel, data.category, data.triggeredAt),
    removeOnComplete: 100,
    removeOnFail: 50,
  });
}

export async function enqueueOfferCollection(): Promise<void> {
  assertRedisEnabled('enfileiramento de coleta');
  const triggeredAt = new Date().toISOString();
  await getCollectorQueue().add(
    'collect-orchestrate',
    { kind: 'orchestrate', triggeredAt },
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
    if (
      job.id === 'offer-collector-repeat' ||
      job.name === 'collect-orchestrate' ||
      job.name === 'collect'
    ) {
      await queue.removeRepeatableByKey(job.key);
    }
  }

  await scheduleCollectorJob();
}

/** Opções de retry compartilhadas: uma queda momentânea de um canal não pode
 * derrubar o envio de vez. Com backoff exponencial o envio é retentado ao longo
 * de ~8 min, tempo de sobra para a sessão religar (WhatsApp) ou o flood control
 * passar (Telegram). */
export const SENDER_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 30_000 },
  removeOnComplete: true,
  removeOnFail: 100,
} as const;

export async function enqueueOfferSend(
  channel: Channel,
  offerId: string,
  accountId = 'default',
): Promise<void> {
  assertRedisEnabled('enfileiramento de envio');
  await getSenderQueue(channel, accountId).add(
    'send',
    { offerId, accountId },
    { jobId: senderJobId(channel, offerId, accountId), ...SENDER_JOB_OPTIONS },
  );
}

export async function enqueueAutoMessageSend(
  channel: Channel,
  autoMessageId: string,
  accountId = 'default',
  options: { force?: boolean } = {},
): Promise<void> {
  assertRedisEnabled('enfileiramento de mensagem automática');
  const suffix = `now-${Date.now()}`;
  await getSenderQueue(channel, accountId).add(
    'send-auto-message',
    { autoMessageId, force: options.force, accountId },
    { jobId: autoMessageJobId(channel, autoMessageId, suffix), ...SENDER_JOB_OPTIONS },
  );
}

export async function enqueueTextMessageSend(
  channel: Channel,
  text: string,
  accountId = 'default',
  options: { force?: boolean } = {},
): Promise<void> {
  assertRedisEnabled('enfileiramento de mensagem de texto');
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await getSenderQueue(channel, accountId).add(
    'send-text',
    { text, force: options.force, accountId },
    { jobId: textMessageJobId(channel, suffix), ...SENDER_JOB_OPTIONS },
  );
}

export async function enqueueScheduledAutoMessageSend(
  channel: Channel,
  autoMessageId: string,
  delayMs: number,
  accountId = 'default',
): Promise<void> {
  assertRedisEnabled('agendamento de mensagem automática');
  await getSenderQueue(channel, accountId).add(
    'send-auto-message',
    { autoMessageId, accountId },
    {
      jobId: autoMessageJobId(channel, autoMessageId, 'scheduled'),
      delay: delayMs,
      ...SENDER_JOB_OPTIONS,
    },
  );
}

export async function cancelScheduledAutoMessageJobs(autoMessageId: string): Promise<void> {
  if (!env.REDIS_ENABLED) return;

  for (const channel of CHANNELS) {
    if (!isChannelEnabled(channel)) continue;
    const accountIds = await getEnabledAccountIdsForChannel(channel);
    for (const accountId of accountIds) {
      const job = await getSenderQueue(channel, accountId).getJob(
        autoMessageJobId(channel, autoMessageId, 'scheduled'),
      );
      if (job) await job.remove();
    }
  }
}

export function getQueueConnection() {
  return connection;
}
