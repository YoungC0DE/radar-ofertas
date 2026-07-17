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

export function startWorkerJson(channel: Channel = 'whatsapp'): string {
  return JSON.stringify(startWorker(channel));
}

export async function stopWorkerJson(channel: Channel = 'whatsapp'): Promise<string> {
  return JSON.stringify(await stopWorker(channel));
}

export async function restartWorkerJson(channel: Channel = 'whatsapp'): Promise<string> {
  return JSON.stringify(await restartWorker(channel));
}

export function getWorkerJson(channel: Channel = 'whatsapp'): string {
  return JSON.stringify(getWorkerState(channel));
}

export function runPrismaGenerateJson(): string {
  return JSON.stringify(runPrismaGenerate());
}

export function getPrismaJson(): string {
  return JSON.stringify(getPrismaState());
}
