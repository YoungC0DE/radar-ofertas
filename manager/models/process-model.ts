import { spawn, type ChildProcess } from 'node:child_process';
import { hostname } from 'node:os';
import { getEnabledAccountIdsForChannel } from '../../src/accounts/channel-accounts.js';
import { resolveAccountAuthPath } from '../../src/accounts/paths.js';
import { findAccount, loadAccounts } from '../../src/accounts/repository.js';
import { DEFAULT_ACCOUNT_ID } from '../../src/accounts/types.js';
import type { Channel } from '../../src/channels/types.js';
import { env } from '../../src/config/env.js';
import { getWorkerHeartbeat, isWorkerHeartbeatFresh } from '../../src/utils/redis-state.js';
import { getWhatsAppOwnerStatusAtPath } from '../../src/whatsapp/index.js';
import { logger } from '../../src/utils/logger.js';

const SPAWN_DISABLED_DETAIL =
  'Workers gerenciados externamente — use Docker ou npm run worker no terminal.';

export function canManagerSpawnWorkers(): boolean {
  return env.MANAGER_CAN_SPAWN_WORKERS;
}

const isWindows = process.platform === 'win32';

function killProcessTree(proc: ChildProcess): void {
  if (!proc.pid) return;
  if (isWindows) {
    spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F']);
    return;
  }
  try {
    process.kill(-proc.pid, 'SIGTERM');
  } catch {
    try {
      proc.kill('SIGTERM');
    } catch {
      /* already gone */
    }
  }
}

function killPidTree(pid: number): void {
  if (isWindows) {
    spawn('taskkill', ['/pid', String(pid), '/T', '/F']);
    return;
  }
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    /* already gone */
  }
}

export type WorkerStatus = 'stopped' | 'starting' | 'running' | 'error';

export interface WorkerState {
  status: WorkerStatus;
  startedAt: string | null;
  detail: string | null;
}

export interface AccountWorkerState {
  accountId: string;
  label: string;
  prefix: string;
  state: WorkerState;
}

const WORKER_SCRIPTS: Record<Channel, string> = {
  whatsapp: 'src/worker.ts',
  telegram: 'src/worker-telegram.ts',
};

interface WorkerSlot {
  proc?: ChildProcess;
  status: WorkerStatus;
  startedAt: string | null;
  detail: string | null;
  externalOwner?: boolean;
}

const workers = new Map<string, WorkerSlot>();

function resolveAccountId(accountId?: string): string {
  return accountId?.trim() || DEFAULT_ACCOUNT_ID;
}

function workerSlotKey(channel: Channel, accountId: string): string {
  return `${channel}:${accountId}`;
}

export function workerDomPrefix(channel: Channel, accountId: string): string {
  if (channel === 'whatsapp' && accountId === DEFAULT_ACCOUNT_ID) return 'worker';
  if (channel === 'telegram' && accountId === DEFAULT_ACCOUNT_ID) return 'worker-tg';
  return `worker-${channel}-${accountId.replace(/[^a-zA-Z0-9_-]+/g, '-')}`;
}

function slot(channel: Channel, accountId: string): WorkerSlot {
  const key = workerSlotKey(channel, accountId);
  let current = workers.get(key);
  if (!current) {
    current = { status: 'stopped', startedAt: null, detail: null };
    workers.set(key, current);
  }
  return current;
}

function externalOwnerDetail(pid: number, host: string | null): string {
  const hostLabel = host && host !== hostname() ? host : 'local';
  return `Ativo em outro processo (PID ${pid}, ${hostLabel})`;
}

function hasLocalWorker(current: WorkerSlot): boolean {
  return !!current.proc && (current.status === 'running' || current.status === 'starting');
}

function spawnEnvForAccount(accountId: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    WORKER_ACCOUNT_ID: accountId === DEFAULT_ACCOUNT_ID ? '' : accountId,
  };
}

async function whatsappAuthPath(accountId: string): Promise<string> {
  return resolveAccountAuthPath(accountId, 'whatsapp');
}

async function syncWhatsAppFromExternalOwner(
  current: WorkerSlot,
  accountId: string,
): Promise<boolean> {
  if (hasLocalWorker(current)) return false;

  const owner = await getWhatsAppOwnerStatusAtPath(await whatsappAuthPath(accountId));
  if (!owner.active || owner.isCurrentProcess) {
    if (current.externalOwner && !owner.active) {
      current.status = 'stopped';
      current.startedAt = null;
      current.detail = null;
      current.externalOwner = false;
    }
    return false;
  }

  current.status = 'running';
  current.proc = undefined;
  current.externalOwner = true;
  current.detail = externalOwnerDetail(owner.pid!, owner.host);
  current.startedAt = current.startedAt ?? new Date().toISOString();
  return true;
}

async function stopWhatsAppExternalOwner(accountId: string): Promise<void> {
  const owner = await getWhatsAppOwnerStatusAtPath(await whatsappAuthPath(accountId));
  if (!owner.active || owner.isCurrentProcess || !owner.pid) return;
  if (owner.host !== hostname()) return;
  killPidTree(owner.pid);
}

async function deriveExternalWorkerState(
  channel: Channel,
  accountId: string,
): Promise<WorkerState> {
  if (channel === 'whatsapp') {
    const owner = await getWhatsAppOwnerStatusAtPath(await whatsappAuthPath(accountId));
    if (owner.active) {
      return {
        status: 'running',
        startedAt: null,
        detail: externalOwnerDetail(owner.pid!, owner.host),
      };
    }
  }

  const heartbeat = await getWorkerHeartbeat(channel, accountId);
  if (heartbeat && isWorkerHeartbeatFresh(heartbeat)) {
    const hostLabel = heartbeat.host !== hostname() ? heartbeat.host : 'local';
    return {
      status: 'running',
      startedAt: heartbeat.startedAt || null,
      detail: `Ativo (PID ${heartbeat.pid}, ${hostLabel})`,
    };
  }

  if (!canManagerSpawnWorkers()) {
    return {
      status: 'stopped',
      startedAt: null,
      detail: SPAWN_DISABLED_DETAIL,
    };
  }

  return { status: 'stopped', startedAt: null, detail: null };
}

export async function getWorkerState(channel: Channel, accountId?: string): Promise<WorkerState> {
  const resolvedAccountId = resolveAccountId(accountId);
  const current = slot(channel, resolvedAccountId);

  if (channel === 'whatsapp') {
    await syncWhatsAppFromExternalOwner(current, resolvedAccountId);
  }

  if (hasLocalWorker(current)) {
    return { status: current.status, startedAt: current.startedAt, detail: current.detail };
  }

  if (current.externalOwner && current.status === 'running') {
    return { status: current.status, startedAt: current.startedAt, detail: current.detail };
  }

  const external = await deriveExternalWorkerState(channel, resolvedAccountId);
  if (external.status !== 'stopped' || !canManagerSpawnWorkers()) {
    return external;
  }

  return { status: current.status, startedAt: current.startedAt, detail: current.detail };
}

export async function listWorkerStates(channel: Channel): Promise<AccountWorkerState[]> {
  const accountIds = await getEnabledAccountIdsForChannel(channel);
  const accounts = await loadAccounts();

  return Promise.all(
    accountIds.map(async (accountId) => {
      const account = accounts.find((row) => row.id === accountId && row.platform === channel);
      const label = account?.label ?? accountId;
      return {
        accountId,
        label,
        prefix: workerDomPrefix(channel, accountId),
        state: await getWorkerState(channel, accountId),
      };
    }),
  );
}

export async function isWorkerRunning(channel: Channel, accountId?: string): Promise<boolean> {
  const { status } = await getWorkerState(channel, accountId);
  return status === 'running' || status === 'starting';
}

export async function startWorker(channel: Channel, accountId?: string): Promise<WorkerState> {
  const resolvedAccountId = resolveAccountId(accountId);

  if (!canManagerSpawnWorkers()) {
    return deriveExternalWorkerState(channel, resolvedAccountId);
  }

  const account = await findAccount(resolvedAccountId, channel);
  if (!account) {
    return {
      status: 'error',
      startedAt: null,
      detail: `Conta "${resolvedAccountId}" não encontrada`,
    };
  }
  if (account.platform !== channel) {
    return {
      status: 'error',
      startedAt: null,
      detail: `Conta "${resolvedAccountId}" é ${account.platform}, não ${channel}`,
    };
  }
  if (!account.enabled) {
    return {
      status: 'error',
      startedAt: null,
      detail: `Conta "${resolvedAccountId}" está desabilitada`,
    };
  }

  const current = slot(channel, resolvedAccountId);

  if (channel === 'whatsapp') {
    await syncWhatsAppFromExternalOwner(current, resolvedAccountId);
    if (current.externalOwner && current.status === 'running') {
      return getWorkerState(channel, resolvedAccountId);
    }
  }

  if (hasLocalWorker(current)) return getWorkerState(channel, resolvedAccountId);

  if (channel === 'whatsapp') {
    const owner = await getWhatsAppOwnerStatusAtPath(await whatsappAuthPath(resolvedAccountId));
    if (owner.active && !owner.isCurrentProcess) {
      current.status = 'running';
      current.proc = undefined;
      current.externalOwner = true;
      current.detail = externalOwnerDetail(owner.pid!, owner.host);
      current.startedAt = new Date().toISOString();
      logger.info(
        { channel, accountId: resolvedAccountId, pid: owner.pid },
        'Worker WhatsApp já ativo em outro processo',
      );
      return getWorkerState(channel, resolvedAccountId);
    }
  }

  current.status = 'starting';
  current.detail = null;
  current.externalOwner = false;
  current.startedAt = new Date().toISOString();

  const proc = spawn('npx', ['tsx', '--env-file=.env', WORKER_SCRIPTS[channel]], {
    cwd: process.cwd(),
    env: spawnEnvForAccount(resolvedAccountId),
    shell: isWindows,
    detached: !isWindows,
    stdio: 'inherit',
  });
  current.proc = proc;

  proc.on('spawn', () => {
    if (current.proc === proc) {
      current.status = 'running';
      current.externalOwner = false;
    }
    logger.info(
      { channel, accountId: resolvedAccountId, pid: proc.pid },
      'Worker iniciado pelo painel',
    );
  });

  proc.on('error', (error) => {
    if (current.proc !== proc) return;
    current.status = 'error';
    current.detail = error.message;
    current.proc = undefined;
    current.externalOwner = false;
    logger.error(
      { channel, accountId: resolvedAccountId, error },
      'Falha ao iniciar worker pelo painel',
    );
  });

  proc.on('exit', (code, signal) => {
    void (async () => {
      if (current.proc === proc) current.proc = undefined;

      if (channel === 'whatsapp' && code === 0) {
        const synced = await syncWhatsAppFromExternalOwner(current, resolvedAccountId);
        if (synced) {
          logger.info(
            { channel, accountId: resolvedAccountId },
            'Worker duplicado encerrado — sessão mantida em outro processo',
          );
          return;
        }
      }

      if (current.externalOwner) return;

      current.status = 'stopped';
      current.detail = `Encerrado (code=${code ?? '—'}, signal=${signal ?? '—'})`;
      current.externalOwner = false;
      logger.info({ channel, accountId: resolvedAccountId, code, signal }, 'Worker encerrado');
    })();
  });

  return getWorkerState(channel, resolvedAccountId);
}

export async function stopWorker(channel: Channel, accountId?: string): Promise<WorkerState> {
  const resolvedAccountId = resolveAccountId(accountId);

  if (!canManagerSpawnWorkers()) {
    return deriveExternalWorkerState(channel, resolvedAccountId);
  }

  const current = slot(channel, resolvedAccountId);
  const proc = current.proc;

  if (!proc) {
    if (channel === 'whatsapp') await stopWhatsAppExternalOwner(resolvedAccountId);
    current.status = 'stopped';
    current.startedAt = null;
    current.detail = null;
    current.externalOwner = false;
    return getWorkerState(channel, resolvedAccountId);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      void (async () => {
        current.status = 'stopped';
        current.startedAt = null;
        current.detail = null;
        current.externalOwner = false;
        resolve(await getWorkerState(channel, resolvedAccountId));
      })();
    };

    proc.once('exit', finish);
    killProcessTree(proc);
    setTimeout(finish, 5000);
  });
}

export async function restartWorker(channel: Channel, accountId?: string): Promise<WorkerState> {
  if (!canManagerSpawnWorkers()) {
    return deriveExternalWorkerState(channel, resolveAccountId(accountId));
  }

  await stopWorker(channel, accountId);
  await new Promise((resolve) => setTimeout(resolve, 500));
  return startWorker(channel, accountId);
}

// --- Prisma generate (run and finish) ----------------------------------------

export type PrismaStatus = 'idle' | 'running' | 'done' | 'error';

export interface PrismaState {
  status: PrismaStatus;
  output: string;
  error: string | null;
}

let prismaStatus: PrismaStatus = 'idle';
let prismaOutput = '';
let prismaError: string | null = null;

export function getPrismaState(): PrismaState {
  return { status: prismaStatus, output: prismaOutput, error: prismaError };
}

export function runPrismaGenerate(): PrismaState {
  if (prismaStatus === 'running') return getPrismaState();

  prismaStatus = 'running';
  prismaOutput = '';
  prismaError = null;

  const proc = spawn('npx', ['prisma', 'generate'], {
    cwd: process.cwd(),
    env: process.env,
    shell: isWindows,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let buffer = '';
  const collect = (chunk: Buffer): void => {
    buffer += chunk.toString();
    if (buffer.length > 8000) buffer = buffer.slice(-8000);
  };
  proc.stdout?.on('data', collect);
  proc.stderr?.on('data', collect);

  proc.on('error', (error) => {
    prismaStatus = 'error';
    prismaError = error.message;
    logger.error({ error }, 'prisma generate falhou ao iniciar');
  });

  proc.on('exit', (code) => {
    prismaOutput = buffer.trim();
    if (code === 0) {
      prismaStatus = 'done';
      prismaError = null;
    } else {
      prismaStatus = 'error';
      prismaError = `prisma generate terminou com código ${code ?? '—'}`;
    }
    logger.info({ code }, 'prisma generate finalizado');
  });

  return getPrismaState();
}
