import { escapeHtml } from '../helpers.js';
import { workerStatusBadge } from './badges.js';

export interface ConnectCardOptions {
  service: 'ml' | 'wa' | 'telegram' | 'worker' | 'prisma';
  name: string;
  icon: string;
  detail: string;
  badgeHtml?: string;
  actionsHtml?: string;
  buttonHtml?: string;
  extraHtml?: string;
  detailId?: string;
}

export function renderConnectCard(options: ConnectCardOptions): string {
  const { service, name, icon, detail, badgeHtml, actionsHtml, buttonHtml, extraHtml, detailId } =
    options;
  const detailAttr = detailId ? ` id="${detailId}"` : '';

  return `<div class="connect-card">
    <div class="connect-card-head">
      <span class="connect-icon connect-icon-${service}">${icon}</span>
      <div class="connect-card-text">
        <div class="connect-name">${escapeHtml(name)}</div>
        <div class="connect-detail meta"${detailAttr}>${escapeHtml(detail)}</div>
        ${extraHtml ?? ''}
      </div>
      ${badgeHtml ?? ''}
    </div>
    ${actionsHtml ? `<div class="op-actions">${actionsHtml}</div>` : ''}
    ${buttonHtml ?? ''}
  </div>`;
}

export interface SimpleConnectCardOptions {
  service: 'ml' | 'wa';
  name: string;
  icon: string;
  status: { ok: boolean; detail: string };
  connectButtonId: string;
}

export function renderSimpleConnectCard(options: SimpleConnectCardOptions): string {
  const { service, name, icon, status, connectButtonId } = options;

  return renderConnectCard({
    service,
    name,
    icon,
    detail: status.detail,
    badgeHtml: status.ok
      ? '<span class="badge ok">Conectado</span>'
      : '<span class="badge warn">Desconectado</span>',
    buttonHtml: `<button type="button" class="btn primary connect-btn" id="${connectButtonId}">
      ${status.ok ? 'Reconectar' : 'Conectar'}
    </button>`,
  });
}

export interface WorkerCardOptions {
  prefix: string;
  channel: 'whatsapp' | 'telegram';
  accountId: string;
  name: string;
  icon: string;
  status: string;
  detail: string;
  spawnEnabled?: boolean;
}

export function renderWorkerCard(options: WorkerCardOptions): string {
  const { prefix, channel, accountId, name, icon, status, detail, spawnEnabled = true } = options;
  const running = status === 'running' || status === 'starting';

  const actionsHtml = spawnEnabled
    ? `
      <button type="button" class="btn primary" id="${prefix}-start"${running ? ' disabled' : ''}>Iniciar</button>
      <button type="button" class="btn" id="${prefix}-restart">Reiniciar</button>
      <button type="button" class="btn btn-danger" id="${prefix}-stop"${running ? '' : ' disabled'}>Parar</button>`
    : '<span class="meta">Gerenciado externamente (Docker/terminal)</span>';

  return `<div data-worker-setup data-worker-prefix="${prefix}" data-worker-channel="${channel}" data-worker-account="${accountId}">
    ${renderConnectCard({
      service: 'worker',
      name,
      icon,
      detail,
      detailId: `${prefix}-detail`,
      badgeHtml: `<span id="${prefix}-badge">${workerStatusBadge(status)}</span>`,
      actionsHtml,
    })}
  </div>`;
}
