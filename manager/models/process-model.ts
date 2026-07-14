import { spawn, type ChildProcess } from 'node:child_process';
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

// --- Worker process -----------------------------------------------------------

export type WorkerStatus = 'stopped' | 'starting' | 'running' | 'error';

export interface WorkerState {
  status: WorkerStatus;
  startedAt: string | null;
  detail: string | null;
}

let workerProc: ChildProcess | undefined;
let workerStatus: WorkerStatus = 'stopped';
let workerStartedAt: string | null = null;
let workerDetail: string | null = null;

export function getWorkerState(): WorkerState {
  return { status: workerStatus, startedAt: workerStartedAt, detail: workerDetail };
}

export function isWorkerRunning(): boolean {
  return workerStatus === 'running' || workerStatus === 'starting';
}

export function startWorker(): WorkerState {
  if (isWorkerRunning()) return getWorkerState();

  workerStatus = 'starting';
  workerDetail = null;
  workerStartedAt = new Date().toISOString();

  const proc = spawn('npx', ['tsx', '--env-file=.env', 'src/worker.ts'], {
    cwd: process.cwd(),
    env: process.env,
    shell: isWindows,
    detached: !isWindows,
    stdio: 'inherit',
  });
  workerProc = proc;

  proc.on('spawn', () => {
    if (workerProc === proc) workerStatus = 'running';
    logger.info({ pid: proc.pid }, 'Worker iniciado pelo painel');
  });

  proc.on('error', (error) => {
    if (workerProc !== proc) return;
    workerStatus = 'error';
    workerDetail = error.message;
    workerProc = undefined;
    logger.error({ error }, 'Falha ao iniciar worker pelo painel');
  });

  proc.on('exit', (code, signal) => {
    if (workerProc === proc) workerProc = undefined;
    workerStatus = 'stopped';
    workerDetail = `Encerrado (code=${code ?? '—'}, signal=${signal ?? '—'})`;
    logger.info({ code, signal }, 'Worker encerrado');
  });

  return getWorkerState();
}

export function stopWorker(): Promise<WorkerState> {
  return new Promise((resolve) => {
    const proc = workerProc;
    if (!proc) {
      workerStatus = 'stopped';
      resolve(getWorkerState());
      return;
    }

    let settled = false;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      resolve(getWorkerState());
    };

    proc.once('exit', finish);
    killProcessTree(proc);
    setTimeout(finish, 5000);
  });
}

export async function restartWorker(): Promise<WorkerState> {
  await stopWorker();
  await new Promise((resolve) => setTimeout(resolve, 500));
  return startWorker();
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
