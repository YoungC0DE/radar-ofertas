import { spawn, type ChildProcess } from 'node:child_process';
import { hostname } from 'node:os';
import type { Channel } from '../../src/channels/types.js';
import { getWhatsAppOwnerStatus } from '../../src/whatsapp/index.js';
import { logger } from '../../src/utils/logger.js';

const isWindows = process.platform === 'win32';

function killProcessTree(proc: ChildProcess): void {
  if (!proc.pid) return;
  if (isWindows) {
    // shell:true spawns cmd.exe as the parent; /T kills the whole tree (npx → node)
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

// --- Worker processes (um por canal) ------------------------------------------
// Cada canal tem seu próprio processo de envio, controlado de forma independente
// pelo painel: parar o WhatsApp não afeta o Telegram.

export type WorkerStatus = 'stopped' | 'starting' | 'running' | 'error';

export interface WorkerState {
  status: WorkerStatus;
  startedAt: string | null;
  detail: string | null;
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

const workers = new Map<Channel, WorkerSlot>();

function slot(channel: Channel): WorkerSlot {
  let current = workers.get(channel);
  if (!current) {
    current = { status: 'stopped', startedAt: null, detail: null };
    workers.set(channel, current);
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

async function syncWhatsAppFromExternalOwner(current: WorkerSlot): Promise<boolean> {
  if (hasLocalWorker(current)) return false;

  const owner = await getWhatsAppOwnerStatus();
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

async function stopWhatsAppExternalOwner(): Promise<void> {
  const owner = await getWhatsAppOwnerStatus();
  if (!owner.active || owner.isCurrentProcess || !owner.pid) return;
  if (owner.host !== hostname()) return;
  killPidTree(owner.pid);
}

export async function getWorkerState(channel: Channel = 'whatsapp'): Promise<WorkerState> {
  const current = slot(channel);
  if (channel === 'whatsapp') await syncWhatsAppFromExternalOwner(current);
  return { status: current.status, startedAt: current.startedAt, detail: current.detail };
}

export async function isWorkerRunning(channel: Channel = 'whatsapp'): Promise<boolean> {
  const { status } = await getWorkerState(channel);
  return status === 'running' || status === 'starting';
}

export async function startWorker(channel: Channel = 'whatsapp'): Promise<WorkerState> {
  const current = slot(channel);

  if (channel === 'whatsapp') {
    await syncWhatsAppFromExternalOwner(current);
    if (current.externalOwner && current.status === 'running') {
      return getWorkerState(channel);
    }
  }

  if (hasLocalWorker(current)) return getWorkerState(channel);

  if (channel === 'whatsapp') {
    const owner = await getWhatsAppOwnerStatus();
    if (owner.active && !owner.isCurrentProcess) {
      current.status = 'running';
      current.proc = undefined;
      current.externalOwner = true;
      current.detail = externalOwnerDetail(owner.pid!, owner.host);
      current.startedAt = new Date().toISOString();
      logger.info({ channel, pid: owner.pid }, 'Worker WhatsApp já ativo em outro processo');
      return getWorkerState(channel);
    }
  }

  current.status = 'starting';
  current.detail = null;
  current.externalOwner = false;
  current.startedAt = new Date().toISOString();

  const proc = spawn('npx', ['tsx', '--env-file=.env', WORKER_SCRIPTS[channel]], {
    cwd: process.cwd(),
    env: process.env,
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
    logger.info({ channel, pid: proc.pid }, 'Worker iniciado pelo painel');
  });

  proc.on('error', (error) => {
    if (current.proc !== proc) return;
    current.status = 'error';
    current.detail = error.message;
    current.proc = undefined;
    current.externalOwner = false;
    logger.error({ channel, error }, 'Falha ao iniciar worker pelo painel');
  });

  proc.on('exit', (code, signal) => {
    void (async () => {
      if (current.proc === proc) current.proc = undefined;

      if (channel === 'whatsapp' && code === 0) {
        const synced = await syncWhatsAppFromExternalOwner(current);
        if (synced) {
          logger.info({ channel }, 'Worker duplicado encerrado — sessão mantida em outro processo');
          return;
        }
      }

      if (current.externalOwner) return;

      current.status = 'stopped';
      current.detail = `Encerrado (code=${code ?? '—'}, signal=${signal ?? '—'})`;
      current.externalOwner = false;
      logger.info({ channel, code, signal }, 'Worker encerrado');
    })();
  });

  return getWorkerState(channel);
}

export async function stopWorker(channel: Channel = 'whatsapp'): Promise<WorkerState> {
  const current = slot(channel);
  const proc = current.proc;

  if (!proc) {
    if (channel === 'whatsapp') await stopWhatsAppExternalOwner();
    current.status = 'stopped';
    current.startedAt = null;
    current.detail = null;
    current.externalOwner = false;
    return getWorkerState(channel);
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
        resolve(await getWorkerState(channel));
      })();
    };

    proc.once('exit', finish);
    killProcessTree(proc);
    setTimeout(finish, 5000);
  });
}

export async function restartWorker(channel: Channel = 'whatsapp'): Promise<WorkerState> {
  await stopWorker(channel);
  await new Promise((resolve) => setTimeout(resolve, 500));
  return startWorker(channel);
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
