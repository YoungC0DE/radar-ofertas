import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { env, type QueueConfig } from './env.js';

export interface QueueConfigOverrides {
  collectorIntervalMinutes?: number;
  senderDelayMs?: number;
  operatingHoursStart?: number;
  operatingHoursEnd?: number;
}

function storePath(): string {
  return path.resolve('./data/queue-config.json');
}

async function loadOverrides(): Promise<QueueConfigOverrides> {
  try {
    const raw = await fs.readFile(storePath(), 'utf8');
    return JSON.parse(raw) as QueueConfigOverrides;
  } catch {
    return {};
  }
}

export function getRuntimeQueueConfig(): QueueConfig {
  try {
    const raw = readFileSync(storePath(), 'utf8');
    const overrides = JSON.parse(raw) as QueueConfigOverrides;
    return { ...env.QUEUE_CONFIG, ...overrides };
  } catch {
    return env.QUEUE_CONFIG;
  }
}

export async function getRuntimeQueueConfigAsync(): Promise<QueueConfig> {
  const overrides = await loadOverrides();
  return { ...env.QUEUE_CONFIG, ...overrides };
}

export async function saveCollectorIntervalMinutes(minutes: number): Promise<void> {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
    throw new Error('Informe um intervalo entre 1 e 1440 minutos');
  }

  const overrides = await loadOverrides();
  overrides.collectorIntervalMinutes = minutes;

  const filePath = storePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(overrides, null, 2)}\n`, 'utf8');
}

export async function saveOperatingHours(startHour: number, endHour: number): Promise<void> {
  if (!Number.isInteger(startHour) || startHour < 0 || startHour > 23) {
    throw new Error('Início deve ser uma hora entre 00:00 e 23:00');
  }

  if (!Number.isInteger(endHour) || endHour < 0 || endHour > 24) {
    throw new Error('Fim deve ser uma hora entre 01:00 e 24:00');
  }

  const storedEnd = endHour === 24 ? 0 : endHour;

  if (storedEnd !== 0 && startHour >= storedEnd) {
    throw new Error('Início deve ser anterior ao fim');
  }

  const overrides = await loadOverrides();
  overrides.operatingHoursStart = startHour;
  overrides.operatingHoursEnd = storedEnd;

  const filePath = storePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(overrides, null, 2)}\n`, 'utf8');
}
