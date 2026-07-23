import { isChannel, type Channel } from '../../src/channels/types.js';
import {
  getPrismaState,
  getWorkerState,
  restartWorker,
  runPrismaGenerate,
  startWorker,
  stopWorker,
} from '../models/process-model.js';

/**
 * Canal alvo das rotas de worker. Sem ?channel=, cai no WhatsApp: as rotas já
 * existiam sem canal e a UI antiga continua funcionando sem mudança.
 */
export function parseChannelParam(value: string | null | undefined): Channel {
  if (value && isChannel(value)) return value;
  return 'whatsapp';
}

export function parseAccountIdParam(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export async function startWorkerJson(
  channel: Channel = 'whatsapp',
  accountId?: string,
): Promise<string> {
  return JSON.stringify(await startWorker(channel, accountId));
}

export async function stopWorkerJson(
  channel: Channel = 'whatsapp',
  accountId?: string,
): Promise<string> {
  return JSON.stringify(await stopWorker(channel, accountId));
}

export async function restartWorkerJson(
  channel: Channel = 'whatsapp',
  accountId?: string,
): Promise<string> {
  return JSON.stringify(await restartWorker(channel, accountId));
}

export async function getWorkerJson(
  channel: Channel = 'whatsapp',
  accountId?: string,
): Promise<string> {
  return JSON.stringify(await getWorkerState(channel, accountId));
}

export function runPrismaGenerateJson(): string {
  return JSON.stringify(runPrismaGenerate());
}

export function getPrismaJson(): string {
  return JSON.stringify(getPrismaState());
}
