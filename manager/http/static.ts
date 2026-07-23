import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ServerResponse } from 'node:http';

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public');

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

export function resolveSafePublicPath(relativePath: string, publicDir: string): string | null {
  const normalized = path.normalize(relativePath);
  if (path.isAbsolute(normalized) || normalized.split(path.sep).includes('..')) {
    return null;
  }

  const baseDir = path.resolve(publicDir);
  const filePath = path.resolve(baseDir, normalized);

  if (!filePath.startsWith(baseDir + path.sep) && filePath !== baseDir) {
    return null;
  }

  return filePath;
}

export async function serveStaticAsset(
  relativePath: string,
  res: ServerResponse,
): Promise<boolean> {
  const filePath = resolveSafePublicPath(relativePath, PUBLIC_DIR);
  if (!filePath) {
    return false;
  }

  try {
    const content = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600',
    });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}
