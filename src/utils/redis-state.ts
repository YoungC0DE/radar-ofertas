import { hostname } from 'node:os';

import { Redis } from 'ioredis';

import { DEFAULT_ACCOUNT_ID } from '../accounts/types.js';
import type { Channel } from '../channels/types.js';
import { env } from '../config/env.js';

export const WORKER_HEARTBEAT_TTL_SEC = 30;
export const WORKER_HEARTBEAT_INTERVAL_MS = 10_000;
export const WORKER_HEARTBEAT_STALE_MS = 30_000;
export const CONNECT_STATE_TTL_SEC = 120;

export type RedisWhatsAppConnectStatus = 'idle' | 'connecting' | 'qr' | 'connected' | 'error';

export interface RedisWhatsAppConnectState {
  status: RedisWhatsAppConnectStatus;
  qr: string | null;
  error: string | null;
  updatedAt: string;
}

export interface RedisWorkerHeartbeat {
  status: 'running';
  startedAt: string;
  detail: string | null;
  pid: number;
  host: string;
  updatedAt: string;
}

let redisClient: Redis | null = null;
let redisFailed = false;

function workerKey(channel: Channel, accountId: string): string {
  return `radar:worker:${channel}:${accountId}`;
}

function waConnectKey(accountId: string): string {
  return `radar:connect:wa:${accountId}`;
}

export function resolveWorkerAccountId(accountId?: string): string {
  if (accountId) return accountId;
  return env.WORKER_ACCOUNT_ID || DEFAULT_ACCOUNT_ID;
}

function getRedis(): Redis | null {
  if (!env.REDIS_ENABLED || redisFailed) return null;
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    redisClient.on('error', () => {
      redisFailed = true;
    });
  }
  return redisClient;
}

async function ensureConnected(redis: Redis): Promise<boolean> {
  try {
    if (redis.status !== 'ready') {
      await redis.connect();
    }
    return true;
  } catch {
    redisFailed = true;
    return false;
  }
}

export async function publishWorkerHeartbeat(
  channel: Channel,
  accountId: string,
  state: Omit<RedisWorkerHeartbeat, 'updatedAt'>,
): Promise<void> {
  const redis = getRedis();
  if (!redis || !(await ensureConnected(redis))) return;

  const payload: RedisWorkerHeartbeat = {
    ...state,
    updatedAt: new Date().toISOString(),
  };

  try {
    const key = workerKey(channel, accountId);
    await redis
      .multi()
      .hset(key, {
        status: payload.status,
        startedAt: payload.startedAt,
        detail: payload.detail ?? '',
        pid: String(payload.pid),
        host: payload.host,
        updatedAt: payload.updatedAt,
      })
      .expire(key, WORKER_HEARTBEAT_TTL_SEC)
      .exec();
  } catch {
    redisFailed = true;
  }
}

export async function getWorkerHeartbeat(
  channel: Channel,
  accountId?: string,
): Promise<RedisWorkerHeartbeat | null> {
  const redis = getRedis();
  if (!redis || !(await ensureConnected(redis))) return null;

  try {
    const raw = await redis.hgetall(workerKey(channel, resolveWorkerAccountId(accountId)));
    if (!raw.status) return null;

    return {
      status: 'running',
      startedAt: raw.startedAt ?? '',
      detail: raw.detail || null,
      pid: Number.parseInt(raw.pid ?? '0', 10),
      host: raw.host ?? 'unknown',
      updatedAt: raw.updatedAt ?? '',
    };
  } catch {
    redisFailed = true;
    return null;
  }
}

export function isWorkerHeartbeatFresh(heartbeat: RedisWorkerHeartbeat): boolean {
  const age = Date.now() - new Date(heartbeat.updatedAt).getTime();
  return Number.isFinite(age) && age >= 0 && age < WORKER_HEARTBEAT_STALE_MS;
}

export async function clearWorkerHeartbeat(channel: Channel, accountId: string): Promise<void> {
  const redis = getRedis();
  if (!redis || !(await ensureConnected(redis))) return;

  try {
    await redis.del(workerKey(channel, accountId));
  } catch {
    redisFailed = true;
  }
}

export function startWorkerHeartbeatLoop(
  channel: Channel,
  accountId: string,
  startedAt: string,
): () => void {
  const publish = (): void => {
    void publishWorkerHeartbeat(channel, accountId, {
      status: 'running',
      startedAt,
      detail: null,
      pid: process.pid,
      host: hostname(),
    });
  };

  publish();
  const timer = setInterval(publish, WORKER_HEARTBEAT_INTERVAL_MS);
  timer.unref?.();

  return () => {
    clearInterval(timer);
    void clearWorkerHeartbeat(channel, accountId);
  };
}

export async function publishWhatsAppConnectState(
  accountId: string,
  state: Pick<RedisWhatsAppConnectState, 'status' | 'qr' | 'error'>,
): Promise<void> {
  const redis = getRedis();
  if (!redis || !(await ensureConnected(redis))) return;

  const payload: RedisWhatsAppConnectState = {
    ...state,
    updatedAt: new Date().toISOString(),
  };

  try {
    const key = waConnectKey(accountId);
    await redis
      .multi()
      .hset(key, {
        status: payload.status,
        qr: payload.qr ?? '',
        error: payload.error ?? '',
        updatedAt: payload.updatedAt,
      })
      .expire(key, CONNECT_STATE_TTL_SEC)
      .exec();
  } catch {
    redisFailed = true;
  }
}

export async function getWhatsAppConnectFromRedis(
  accountId?: string,
): Promise<RedisWhatsAppConnectState | null> {
  const redis = getRedis();
  if (!redis || !(await ensureConnected(redis))) return null;

  try {
    const raw = await redis.hgetall(waConnectKey(resolveWorkerAccountId(accountId)));
    if (!raw.status) return null;

    return {
      status: raw.status as RedisWhatsAppConnectStatus,
      qr: raw.qr || null,
      error: raw.error || null,
      updatedAt: raw.updatedAt ?? '',
    };
  } catch {
    redisFailed = true;
    return null;
  }
}

export async function closeRedisState(): Promise<void> {
  if (redisClient) {
    await redisClient.quit().catch(() => undefined);
    redisClient = null;
  }
}
