import { Queue } from 'bullmq';
import { getCollectorIntervalMinutes } from '../config/queue-config-store.js';
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

export function getSenderQueueName(channel: Channel): string {
  return SENDER_QUEUE_NAMES[channel];
}

export interface CollectorJobData {
  triggeredAt: string;
}

export interface SenderJobData {
  offerId?: string;
  autoMessageId?: string;
  text?: string;
  force?: boolean;
}

/** Job id determinístico: garante um envio por oferta por canal. */
export function senderJobId(channel: Channel, offerId: string): string {
  return `send-offer-${channel}-${offerId}`;
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

export function getSenderQueue(channel: Channel): Queue<SenderJobData> {
  assertRedisEnabled('filas de envio');
  return new Queue<SenderJobData>(getSenderQueueName(channel), { connection });
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

export async function enqueueOfferSend(channel: Channel, offerId: string): Promise<void> {
  assertRedisEnabled('enfileiramento de envio');
  const queue = getSenderQueue(channel);
  try {
    await queue.add('send', { offerId }, { jobId: senderJobId(channel, offerId), ...SENDER_JOB_OPTIONS });
  } finally {
    await queue.close();
  }
}

export async function enqueueAutoMessageSend(
  channel: Channel,
  autoMessageId: string,
  options: { force?: boolean } = {},
): Promise<void> {
  assertRedisEnabled('enfileiramento de mensagem automática');
  const queue = getSenderQueue(channel);
  const suffix = `now-${Date.now()}`;
  try {
    await queue.add(
      'send-auto-message',
      { autoMessageId, force: options.force },
      { jobId: autoMessageJobId(channel, autoMessageId, suffix), ...SENDER_JOB_OPTIONS },
    );
  } finally {
    await queue.close();
  }
}

export async function enqueueTextMessageSend(
  channel: Channel,
  text: string,
  options: { force?: boolean } = {},
): Promise<void> {
  assertRedisEnabled('enfileiramento de mensagem de texto');
  const queue = getSenderQueue(channel);
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    await queue.add(
      'send-text',
      { text, force: options.force },
      { jobId: textMessageJobId(channel, suffix), ...SENDER_JOB_OPTIONS },
    );
  } finally {
    await queue.close();
  }
}

export async function enqueueScheduledAutoMessageSend(
  channel: Channel,
  autoMessageId: string,
  delayMs: number,
): Promise<void> {
  assertRedisEnabled('agendamento de mensagem automática');
  const queue = getSenderQueue(channel);
  try {
    await queue.add(
      'send-auto-message',
      { autoMessageId },
      {
        jobId: autoMessageJobId(channel, autoMessageId, 'scheduled'),
        delay: delayMs,
        ...SENDER_JOB_OPTIONS,
      },
    );
  } finally {
    await queue.close();
  }
}

export async function cancelScheduledAutoMessageJobs(autoMessageId: string): Promise<void> {
  if (!env.REDIS_ENABLED) return;

  for (const channel of CHANNELS) {
    if (!isChannelEnabled(channel)) continue;
    const queue = getSenderQueue(channel);
    try {
      const job = await queue.getJob(autoMessageJobId(channel, autoMessageId, 'scheduled'));
      if (job) await job.remove();
    } finally {
      await queue.close();
    }
  }
}

export function getQueueConnection() {
  return connection;
}
