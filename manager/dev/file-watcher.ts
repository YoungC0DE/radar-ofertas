import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const SKIP_DIRS = new Set(['node_modules', '.git']);
const WATCH_EXTENSIONS = new Set(['.ts', '.js', '.css', '.json', '.svg']);

function collectWatchFiles(rootDir: string, files: string[] = []): string[] {
  let entries;
  try {
    entries = readdirSync(rootDir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      collectWatchFiles(path.join(rootDir, entry.name), files);
      continue;
    }

    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!WATCH_EXTENSIONS.has(ext)) continue;
    files.push(path.join(rootDir, entry.name));
  }

  return files;
}

function snapshotMtimes(rootDirs: readonly string[]): Map<string, number> {
  const snapshot = new Map<string, number>();

  for (const rootDir of rootDirs) {
    for (const filePath of collectWatchFiles(rootDir)) {
      try {
        snapshot.set(filePath, statSync(filePath).mtimeMs);
      } catch {
        // arquivo removido entre listagem e stat — ignorar neste tick
      }
    }
  }

  return snapshot;
}

function hasSnapshotChanged(before: Map<string, number>, after: Map<string, number>): boolean {
  if (before.size !== after.size) return true;

  for (const [filePath, mtimeMs] of after) {
    if (before.get(filePath) !== mtimeMs) return true;
  }

  return false;
}

/** Polling confiável em bind mounts (Docker Desktop / Windows). */
export function startPollingFileWatcher(
  rootDirs: readonly string[],
  onChange: () => void,
  intervalMs = 800,
): () => void {
  let snapshot = snapshotMtimes(rootDirs);

  const timer = setInterval(() => {
    const next = snapshotMtimes(rootDirs);
    if (hasSnapshotChanged(snapshot, next)) {
      snapshot = next;
      onChange();
    }
  }, intervalMs);

  return () => clearInterval(timer);
}
