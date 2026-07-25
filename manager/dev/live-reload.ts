import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { startPollingFileWatcher } from './file-watcher.js';
import { isManagerHotReloadEnabled } from './mode.js';
import { logger } from '../../src/utils/logger.js';

const MANAGER_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

let bootId = String(Date.now());
let stopWatcher: (() => void) | null = null;
let bumpTimer: ReturnType<typeof setTimeout> | null = null;

export function getDevBootId(): string {
  return bootId;
}

export function bumpDevBootId(): void {
  bootId = String(Date.now());
}

export function handleDevLiveReloadStream(req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
  });

  const push = (): void => {
    res.write(`data: ${getDevBootId()}\n\n`);
  };

  push();
  const heartbeat = setInterval(push, 1500);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
}

function scheduleBootBump(): void {
  if (bumpTimer) clearTimeout(bumpTimer);
  bumpTimer = setTimeout(() => {
    bumpTimer = null;
    bumpDevBootId();
    logger.debug('Dev live reload — arquivos do manager alterados');
  }, 120);
}

export function startDevLiveReload(): void {
  if (!isManagerHotReloadEnabled()) return;

  stopWatcher = startPollingFileWatcher([MANAGER_ROOT], scheduleBootBump);

  logger.info('Dev live reload ativo — o browser recarrega ao salvar arquivos do manager');
}

export function stopDevLiveReload(): void {
  if (bumpTimer) {
    clearTimeout(bumpTimer);
    bumpTimer = null;
  }
  stopWatcher?.();
  stopWatcher = null;
}
