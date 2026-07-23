import type { SettingsData } from '../../../models/settings-model.js';
import type { AccountWorkerState } from '../../../models/process-model.js';
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

function renderAccountWorkerCard(
  channel: 'whatsapp' | 'telegram',
  worker: AccountWorkerState,
  icon: string,
  spawnEnabled: boolean,
): string {
  const channelLabel = channel === 'whatsapp' ? 'WhatsApp' : 'Telegram';
  const running = worker.state.status === 'running' || worker.state.status === 'starting';
  const detail =
    worker.state.detail ??
    (running ? 'Processo de envio em execução' : 'Processo de envio parado');
  const accountSuffix =
    worker.accountId === 'default' ? '' : ` — ${escapeHtml(worker.label)} (${escapeHtml(worker.accountId)})`;

  return renderWorkerCard({
    prefix: worker.prefix,
    channel,
    accountId: worker.accountId,
    name: `Worker de envio — ${channelLabel}${accountSuffix}`,
    icon,
    status: worker.state.status,
    detail,
    spawnEnabled,
  });
}

function renderChannelWorkerCards(
  channel: 'whatsapp' | 'telegram',
  workers: AccountWorkerState[],
  icon: string,
  spawnEnabled: boolean,
): string {
  if (workers.length === 0) return '';
  return workers.map((worker) => renderAccountWorkerCard(channel, worker, icon, spawnEnabled)).join('');
}

export function renderOperationsSection(data: SettingsData): string {
  const opsHint = data.canSpawnWorkers
    ? 'Controle os processos do bot direto pelo painel — um worker por conta habilitada (<code>WORKER_ACCOUNT_ID</code>). Não rode <code>npm run worker</code> manualmente para a mesma conta ao mesmo tempo.'
    : 'Workers rodam como serviços separados (Docker ou terminal). O painel apenas exibe o status via Redis e <code>owner.lock</code> — não inicia nem para processos.';

  return `
    <section class="connect-section">
      <h2>Operações</h2>
      <p class="meta">${opsHint}</p>
      <div class="connect-grid">
        ${renderChannelWorkerCards('whatsapp', data.whatsappWorkers, WORKER_ICON, data.canSpawnWorkers)}
        ${data.telegramEnabled ? renderChannelWorkerCards('telegram', data.telegramWorkers, TELEGRAM_ICON, data.canSpawnWorkers) : ''}
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
