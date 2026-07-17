import { spawn, type ChildProcess } from 'node:child_process';
import type { Channel } from '../../src/channels/types.js';
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

export function getWorkerState(channel: Channel = 'whatsapp'): WorkerState {
  const current = slot(channel);
  return { status: current.status, startedAt: current.startedAt, detail: current.detail };
}

export function isWorkerRunning(channel: Channel = 'whatsapp'): boolean {
  const { status } = slot(channel);
  return status === 'running' || status === 'starting';
}

export function startWorker(channel: Channel = 'whatsapp'): WorkerState {
  if (isWorkerRunning(channel)) return getWorkerState(channel);

  const current = slot(channel);
  current.status = 'starting';
  current.detail = null;
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
    if (current.proc === proc) current.status = 'running';
    logger.info({ channel, pid: proc.pid }, 'Worker iniciado pelo painel');
  });

  proc.on('error', (error) => {
    if (current.proc !== proc) return;
    current.status = 'error';
    current.detail = error.message;
    current.proc = undefined;
    logger.error({ channel, error }, 'Falha ao iniciar worker pelo painel');
  });

  proc.on('exit', (code, signal) => {
    if (current.proc === proc) current.proc = undefined;
    current.status = 'stopped';
    current.detail = `Encerrado (code=${code ?? '—'}, signal=${signal ?? '—'})`;
    logger.info({ channel, code, signal }, 'Worker encerrado');
  });

  return getWorkerState(channel);
}

export function stopWorker(channel: Channel = 'whatsapp'): Promise<WorkerState> {
  return new Promise((resolve) => {
    const current = slot(channel);
    const proc = current.proc;

    if (!proc) {
      current.status = 'stopped';
      resolve(getWorkerState(channel));
      return;
    }

    let settled = false;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      resolve(getWorkerState(channel));
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
