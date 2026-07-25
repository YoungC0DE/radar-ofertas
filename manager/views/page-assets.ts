import { statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isManagerHotReloadEnabled } from '../dev/mode.js';

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public');

/** URL pública do asset com cache-bust por mtime em dev (CSS/JS atualizam ao salvar + F5). */
export function assetHref(relativePath: string): string {
  const normalized = relativePath.replace(/^\/+/, '');
  const base = `/manager/assets/${normalized}`;

  if (!isManagerHotReloadEnabled()) {
    return base;
  }

  try {
    const filePath = path.join(PUBLIC_DIR, normalized);
    const { mtimeMs } = statSync(filePath);
    return `${base}?v=${Math.floor(mtimeMs)}`;
  } catch {
    return `${base}?v=${Date.now()}`;
  }
}

export function pageStyles(...files: string[]): string {
  return files.map((file) => `<link rel="stylesheet" href="${assetHref(`css/${file}`)}">`).join('\n');
}

export function pageScripts(...files: string[]): string {
  return files.map((file) => `<script src="${assetHref(`js/${file}`)}" defer></script>`).join('\n');
}

export function pageData(id: string, data: unknown): string {
  return `<script type="application/json" id="${id}">${JSON.stringify(data)}</script>`;
}

export const LAYOUT_SCRIPTS = pageScripts('shared/confirm.js');
