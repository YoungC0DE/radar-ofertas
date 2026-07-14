import {
  getPrismaState,
  getWorkerState,
  restartWorker,
  runPrismaGenerate,
  startWorker,
  stopWorker,
} from '../models/process-model.js';

export function startWorkerJson(): string {
  return JSON.stringify(startWorker());
}

export async function stopWorkerJson(): Promise<string> {
  return JSON.stringify(await stopWorker());
}

export async function restartWorkerJson(): Promise<string> {
  return JSON.stringify(await restartWorker());
}

export function getWorkerJson(): string {
  return JSON.stringify(getWorkerState());
}

export function runPrismaGenerateJson(): string {
  return JSON.stringify(runPrismaGenerate());
}

export function getPrismaJson(): string {
  return JSON.stringify(getPrismaState());
}
