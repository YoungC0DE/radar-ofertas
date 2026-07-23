import type { SettingsData } from '../../../models/settings-model.js';
import { escapeHtml } from '../../helpers.js';
import {
  ML_ICON,
  PRISMA_ICON,
  renderConnectCard,
  renderSimpleConnectCard,
  renderWorkerCard,
  TELEGRAM_ICON,
  WA_ICON,
  WORKER_ICON,
} from '../../components/index.js';

function renderTelegramConnectCard(data: SettingsData): string {
  const badge = !data.telegramEnabled
    ? '<span class="badge warn">Desativado</span>'
    : data.tgSession?.ok
      ? '<span class="badge ok">Conectado</span>'
      : '<span class="badge warn">Desconectado</span>';

  const detail = !data.telegramEnabled
    ? 'Defina TELEGRAM_ENABLED=true no .env e reinicie o painel'
    : (data.tgSession?.detail ?? 'Verificando…');

  const chatLine =
    data.telegramEnabled && data.telegramChatId
      ? `<div class="connect-detail meta">Canal: ${escapeHtml(data.telegramChatId)}</div>`
      : '';

  return renderConnectCard({
    service: 'telegram',
    name: 'Telegram',
    icon: TELEGRAM_ICON,
    detail,
    detailId: 'telegram-connect-detail',
    badgeHtml: `<span id="telegram-connect-badge">${badge}</span>`,
    extraHtml: chatLine,
    buttonHtml: `<button type="button" class="btn primary connect-btn" id="connect-telegram"${data.telegramEnabled ? '' : ' disabled'}>
      Verificar conexão
    </button>`,
  });
}

export function renderConnectionsSection(data: SettingsData): string {
  return `
    <section class="connect-section">
      <h2>Conectar com</h2>
      <p class="meta">Autentique as contas usadas pelo bot direto por aqui — sem precisar rodar comandos no terminal.</p>
      <div class="connect-grid">
        ${renderSimpleConnectCard({ service: 'ml', name: 'Mercado Livre', icon: ML_ICON, status: data.mlSession, connectButtonId: 'connect-ml' })}
        ${renderSimpleConnectCard({ service: 'wa', name: 'WhatsApp', icon: WA_ICON, status: data.waSession, connectButtonId: 'connect-wa' })}
        ${renderTelegramConnectCard(data)}
      </div>
    </section>`;
}

function renderTelegramWorkerCard(data: SettingsData): string {
  if (!data.telegramEnabled) return '';

  const worker = data.telegramWorkerState;
  const running = worker.status === 'running' || worker.status === 'starting';
  const detail =
    worker.detail ??
    data.tgSession?.detail ??
    (running ? 'Processo de envio em execução' : 'Processo de envio parado');

  return renderWorkerCard({
    prefix: 'worker-tg',
    name: 'Worker de envio — Telegram',
    icon: TELEGRAM_ICON,
    status: worker.status,
    detail,
    spawnEnabled: data.canSpawnWorkers,
  });
}

export function renderOperationsSection(data: SettingsData): string {
  const worker = data.workerState;
  const running = worker.status === 'running' || worker.status === 'starting';
  const workerDetail = worker.detail ?? (running ? 'Processo de envio em execução' : 'Processo de envio parado');
  const opsHint = data.canSpawnWorkers
    ? 'Controle os processos do bot direto pelo painel. Os workers aqui são gerenciados por este painel — não rode um <code>npm run worker</code> no terminal ao mesmo tempo. Cada canal tem seu próprio worker: parar um não afeta o outro.'
    : 'Workers rodam como serviços separados (Docker ou terminal). O painel apenas exibe o status via Redis e <code>owner.lock</code> — não inicia nem para processos.';

  return `
    <section class="connect-section">
      <h2>Operações</h2>
      <p class="meta">${opsHint}</p>
      <div class="connect-grid">
        ${renderWorkerCard({
          prefix: 'worker',
          name: 'Worker de envio — WhatsApp',
          icon: WORKER_ICON,
          status: worker.status,
          detail: workerDetail,
          spawnEnabled: data.canSpawnWorkers,
        })}
        ${renderTelegramWorkerCard(data)}
        ${renderConnectCard({
          service: 'prisma',
          name: 'Prisma Client',
          icon: PRISMA_ICON,
          detail: 'Regenera o client do Prisma (<code>npm run prisma</code>)',
          actionsHtml: '<button type="button" class="btn primary" id="prisma-generate">Gerar Prisma Client</button>',
        })}
      </div>
    </section>`;
}
