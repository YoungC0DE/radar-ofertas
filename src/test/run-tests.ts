import { readdirSync } from 'node:fs';
import path from 'node:path';
import { run } from 'node:test';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '../..');
const roots = [path.join(root, 'src'), path.join(root, 'manager')];
const skipDirs = new Set(['node_modules', 'build', '.git']);

function findTestFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue;
      files.push(...findTestFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

const files = roots.flatMap((dir) => findTestFiles(dir));

if (files.length === 0) {
  console.error('Nenhum arquivo de teste encontrado');
  process.exit(1);
}

const result = await run({
  files: files.map((file) => pathToFileURL(file).href),
});

process.exit(result.failed > 0 ? 1 : 0);
