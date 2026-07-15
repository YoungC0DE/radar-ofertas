import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { printPreflight, printSetupGuide, runPreflight } from './preflight.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const children: ChildProcess[] = [];

function spawnScript(script: string): ChildProcess {
  const isWindows = process.platform === 'win32';
  const child = spawn(isWindows ? 'npm.cmd' : 'npm', ['run', script], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, RADAR_SKIP_PREFLIGHT: '1' },
    shell: isWindows,
  });

  children.push(child);
  return child;
}

function shutdown(signal: string): void {
  console.log(`\n${signal} — encerrando processos...`);
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal === 'SIGINT' ? 'SIGINT' : 'SIGTERM');
    }
  }
  process.exit(0);
}

async function main(): Promise<void> {
  const result = await runPreflight('all');
  printPreflight(result.items);

  if (!result.ok) {
    console.log('Corrija os itens acima antes de continuar.\n');
    printSetupGuide();
    process.exit(1);
  }

  console.log('Subindo collector e manager...\n');

  // O worker de envio NÃO sobe aqui: quem gerencia o worker é o painel (Settings
  // › Worker de envio). Subir um worker também aqui criaria dois donos da sessão
  // do WhatsApp ao mesmo tempo (connectionReplaced em loop).
  spawnScript('dev');
  spawnScript('manager');

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
