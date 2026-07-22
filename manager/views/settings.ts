import type { SettingsData } from '../models/settings-model.js';
import {
  SCORE_CATEGORY_KEYS,
  SCORE_CATEGORY_LABELS,
  type ScoreCategoryKey,
  type ScoreTier,
} from '../../src/config/score-config.js';
import { escapeHtml } from './helpers.js';
import { renderLayout } from './layout.js';

function configRow(label: string, value: string, hint?: string): string {
  return `<div class="config-row">
    <div class="config-label">${escapeHtml(label)}</div>
    <div class="config-value">${value}</div>
    ${hint ? `<div class="config-hint">${hint}</div>` : ''}
  </div>`;
}

const EDIT_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;

function renderEditableValue(label: string, display: string, editButtonId: string): string {
  return `<div class="channel-inline">
    <span class="channel-name">${escapeHtml(display)}</span>
    <div class="channel-actions">
      <button type="button" class="btn btn-sm btn-icon" id="${editButtonId}" title="Editar ${escapeHtml(label)}">${EDIT_ICON}</button>
    </div>
  </div>`;
}

function endHourForForm(end: number): number {
  return end === 0 ? 24 : end;
}

function renderHourInput(name: string, id: string, value: number, kind: 'start' | 'end'): string {
  const min = kind === 'start' ? 0 : 1;
  const max = kind === 'start' ? 23 : 24;

  return `<div class="hour-input-wrap">
    <input
      type="number"
      id="${id}"
      name="${name}"
      value="${value}"
      min="${min}"
      max="${max}"
      step="1"
      required
      class="modal-input hour-input"
    >
    <span class="hour-input-suffix">:00</span>
  </div>`;
}

function renderOperatingHoursSection(data: SettingsData, statusBadge: string): string {
  const value = `
    <div class="channel-inline">
      <span class="channel-name">${escapeHtml(data.operatingHoursLabel)} ${statusBadge}</span>
      <div class="channel-actions">
        <button type="button" class="btn btn-sm btn-icon" id="edit-operating-hours" title="Editar janela operacional">${EDIT_ICON}</button>
      </div>
    </div>`;

  return configRow('Janela operacional', value, 'Horário em que o bot coleta e envia ofertas');
}

// As fontes de coleta migraram para páginas próprias por canal (menu lateral →
// Fontes de coleta), já que cada canal tem sua própria seleção. Aqui só apontamos
// para elas.
function renderSourcesPointer(data: SettingsData): string {
  const links = [
    `<a class="link" href="/manager/sources/whatsapp">Fontes do WhatsApp</a>`,
    ...(data.telegramEnabled ? [`<a class="link" href="/manager/sources/telegram">Fontes do Telegram</a>`] : []),
  ].join(' · ');

  return configRow(
    'Fontes de coleta',
    `<div class="config-value">${links}</div>`,
    'Cada canal tem sua própria seleção de fontes — configure em páginas separadas',
  );
}

function renderBrandSection(data: SettingsData): string {
  const logoMark = data.brandLogoHref
    ? `<img src="${escapeHtml(data.brandLogoHref)}" alt="">`
    : escapeHtml(data.brandInitial);

  const brandValue = `
    <div class="brand-settings">
      <div class="brand-preview">
        <div class="brand-preview-mark">${logoMark}</div>
        <div class="brand-preview-text">
          <div class="brand-preview-name">${escapeHtml(data.brandName)}</div>
          <div class="meta">${escapeHtml(data.brandSubtitle)}</div>
        </div>
        <button type="button" class="btn btn-sm btn-icon" id="edit-brand" title="Editar identidade visual">${EDIT_ICON}</button>
      </div>
    </div>`;

  return configRow('Identidade visual', brandValue, 'Nome e ícone exibidos na barra lateral do painel');
}

function scoreComparatorLabel(key: ScoreCategoryKey): string {
  return key === 'price' ? '≤' : '≥';
}

function scoreUnitLabel(key: ScoreCategoryKey): string {
  if (key === 'discount') return '%';
  if (key === 'rating') return 'estrelas';
  if (key === 'soldQuantity') return 'un.';
  return 'R$';
}

function renderScoreTierFields(key: ScoreCategoryKey, index: number, tier: ScoreTier): string {
  const step = key === 'rating' ? '0.1' : '1';
  const maxAttr = key === 'discount' ? ' max="100"' : key === 'rating' ? ' max="5"' : '';

  return `<div class="score-tier">
    <label class="score-tier-flag">
      <input type="checkbox" name="${key}Tier${index}Enabled" value="1"${tier.enabled ? ' checked' : ''}>
      <span class="score-tier-label">Faixa ${index + 1}</span>
    </label>
    <div class="score-tier-rule">
      <span class="score-tier-cmp">${scoreComparatorLabel(key)}</span>
      <input
        type="number"
        name="${key}Tier${index}Threshold"
        value="${tier.threshold}"
        min="0"
        step="${step}"
        class="score-tier-input"
        ${maxAttr}
      >
      <span class="score-tier-unit">${scoreUnitLabel(key)}</span>
      <span class="score-tier-arrow">→</span>
      <span class="score-tier-points-label">+</span>
      <input
        type="number"
        name="${key}Tier${index}Points"
        value="${tier.points}"
        min="0"
        step="1"
        class="score-tier-input score-tier-points"
      >
      <span class="score-tier-unit">pts</span>
    </div>
  </div>`;
}

function renderScoreCategoryBlock(key: ScoreCategoryKey, data: SettingsData): string {
  const category = data.scoreConfig[key];
  const tiers = category.tiers
    .map((tier, index) => renderScoreTierFields(key, index, tier))
    .join('');

  return `<div class="score-category">
    <label class="score-category-flag">
      <input type="checkbox" name="${key}Enabled" value="1"${category.enabled ? ' checked' : ''}>
      <strong>${SCORE_CATEGORY_LABELS[key]}</strong>
    </label>
    <div class="score-tier-list">${tiers}</div>
  </div>`;
}

function renderScoreSection(data: SettingsData): string {
  const rulesHint =
    data.scoreRulesSummary.length > 0
      ? data.scoreRulesSummary.map((line) => escapeHtml(line)).join('<br>')
      : '<span class="meta">Nenhuma regra ativa</span>';

  const value = `
    <div class="channel-inline score-settings-inline">
      <div>
        <div class="channel-name">Mínimo: ${data.minScore} pts</div>
        <div class="score-rules-summary meta">${rulesHint}</div>
      </div>
      <div class="channel-actions">
        <button type="button" class="btn btn-sm btn-icon" id="edit-score" title="Editar pontuação">${EDIT_ICON}</button>
      </div>
    </div>`;

  return configRow('Pontuação', value, 'Critérios e score mínimo para aceitar ofertas');
}

const ML_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`;
const WA_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`;

function renderConnectCard(
  service: 'ml' | 'wa',
  name: string,
  icon: string,
  status: { ok: boolean; detail: string },
): string {
  const badge = status.ok
    ? '<span class="badge ok">Conectado</span>'
    : '<span class="badge warn">Desconectado</span>';

  return `<div class="connect-card">
    <div class="connect-card-head">
      <span class="connect-icon connect-icon-${service}">${icon}</span>
      <div class="connect-card-text">
        <div class="connect-name">${escapeHtml(name)}</div>
        <div class="connect-detail meta">${escapeHtml(status.detail)}</div>
      </div>
      ${badge}
    </div>
    <button type="button" class="btn primary connect-btn" id="connect-${service}">
      ${status.ok ? 'Reconectar' : 'Conectar'}
    </button>
  </div>`;
}

// O Telegram não tem fluxo interativo como WhatsApp (QR) ou ML (login no
// navegador): o bot é configurado no .env (@BotFather) e adicionado como admin do
// canal. Aqui só mostramos o status do bot/canal e um botão para reverificar.
function renderTelegramConnectCard(data: SettingsData): string {
  const badge = !data.telegramEnabled
    ? '<span class="badge warn">Desativado</span>'
    : data.tgSession?.ok
      ? '<span class="badge ok">Conectado</span>'
      : '<span class="badge warn">Desconectado</span>';

  const detail = !data.telegramEnabled
    ? 'Defina TELEGRAM_ENABLED=true no .env e reinicie o painel'
    : (data.tgSession?.detail ?? 'Verificando…');

  const chatLine = data.telegramEnabled && data.telegramChatId
    ? `<div class="connect-detail meta">Canal: ${escapeHtml(data.telegramChatId)}</div>`
    : '';

  return `<div class="connect-card">
    <div class="connect-card-head">
      <span class="connect-icon connect-icon-telegram">${TELEGRAM_ICON}</span>
      <div class="connect-card-text">
        <div class="connect-name">Telegram</div>
        <div class="connect-detail meta" id="telegram-connect-detail">${escapeHtml(detail)}</div>
        ${chatLine}
      </div>
      <span id="telegram-connect-badge">${badge}</span>
    </div>
    <button type="button" class="btn primary connect-btn" id="connect-telegram"${data.telegramEnabled ? '' : ' disabled'}>
      Verificar conexão
    </button>
  </div>`;
}

function renderConnectionsSection(data: SettingsData): string {
  return `
    <section class="connect-section">
      <h2>Conectar com</h2>
      <p class="meta">Autentique as contas usadas pelo bot direto por aqui — sem precisar rodar comandos no terminal.</p>
      <div class="connect-grid">
        ${renderConnectCard('ml', 'Mercado Livre', ML_ICON, data.mlSession)}
        ${renderConnectCard('wa', 'WhatsApp', WA_ICON, data.waSession)}
        ${renderTelegramConnectCard(data)}
      </div>
    </section>`;
}

const WORKER_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
const PRISMA_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.8 15.4 13.6 2.7a1.6 1.6 0 0 0-2.9.4L4.1 18.6a1.6 1.6 0 0 0 1 2l8.6 2.3a1.6 1.6 0 0 0 2-1.9z"/><path d="M9 4 7 19l8 2"/></svg>`;
const TELEGRAM_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 4.3 2.9 11.4a.6.6 0 0 0 .05 1.13l4.6 1.5 1.75 5.3a.6.6 0 0 0 1 .24l2.6-2.5 4.7 3.45a.6.6 0 0 0 .95-.36l3.2-15a.6.6 0 0 0-.8-.7z"/><path d="m7.55 14.03 11-7.2-8.2 8.6"/></svg>`;

function workerStatusBadge(status: string): string {
  if (status === 'running') return '<span class="badge ok">Rodando</span>';
  if (status === 'starting') return '<span class="badge warn">Iniciando…</span>';
  if (status === 'error') return '<span class="badge err">Erro</span>';
  return '<span class="badge warn">Parado</span>';
}

function renderTelegramWorkerCard(data: SettingsData): string {
  // O card só existe com TELEGRAM_ENABLED=true: sem isso o worker encerraria no
  // boot e os botões não teriam o que controlar.
  if (!data.telegramEnabled) return '';

  const worker = data.telegramWorkerState;
  const running = worker.status === 'running' || worker.status === 'starting';
  const detail =
    worker.detail ??
    data.tgSession?.detail ??
    (running ? 'Processo de envio em execução' : 'Processo de envio parado');

  return `
        <div class="connect-card">
          <div class="connect-card-head">
            <span class="connect-icon connect-icon-worker">${TELEGRAM_ICON}</span>
            <div class="connect-card-text">
              <div class="connect-name">Worker de envio — Telegram</div>
              <div class="connect-detail meta" id="worker-tg-detail">${escapeHtml(detail)}</div>
            </div>
            <span id="worker-tg-badge">${workerStatusBadge(worker.status)}</span>
          </div>
          <div class="op-actions">
            <button type="button" class="btn primary" id="worker-tg-start"${running ? ' disabled' : ''}>Iniciar</button>
            <button type="button" class="btn" id="worker-tg-restart">Reiniciar</button>
            <button type="button" class="btn btn-danger" id="worker-tg-stop"${running ? '' : ' disabled'}>Parar</button>
          </div>
        </div>`;
}

function renderOperationsSection(data: SettingsData): string {
  const worker = data.workerState;
  const running = worker.status === 'running' || worker.status === 'starting';
  const workerDetail = worker.detail ?? (running ? 'Processo de envio em execução' : 'Processo de envio parado');

  return `
    <section class="connect-section">
      <h2>Operações</h2>
      <p class="meta">Controle os processos do bot direto pelo painel. Os workers aqui são gerenciados por este painel — não rode um <code>npm run worker</code> no terminal ao mesmo tempo. Cada canal tem seu próprio worker: parar um não afeta o outro.</p>
      <div class="connect-grid">
        <div class="connect-card">
          <div class="connect-card-head">
            <span class="connect-icon connect-icon-worker">${WORKER_ICON}</span>
            <div class="connect-card-text">
              <div class="connect-name">Worker de envio — WhatsApp</div>
              <div class="connect-detail meta" id="worker-detail">${escapeHtml(workerDetail)}</div>
            </div>
            <span id="worker-badge">${workerStatusBadge(worker.status)}</span>
          </div>
          <div class="op-actions">
            <button type="button" class="btn primary" id="worker-start"${running ? ' disabled' : ''}>Iniciar</button>
            <button type="button" class="btn" id="worker-restart">Reiniciar</button>
            <button type="button" class="btn btn-danger" id="worker-stop"${running ? '' : ' disabled'}>Parar</button>
          </div>
        </div>
        ${renderTelegramWorkerCard(data)}
        <div class="connect-card">
          <div class="connect-card-head">
            <span class="connect-icon connect-icon-prisma">${PRISMA_ICON}</span>
            <div class="connect-card-text">
              <div class="connect-name">Prisma Client</div>
              <div class="connect-detail meta">Regenera o client do Prisma (<code>npm run prisma</code>)</div>
            </div>
          </div>
          <div class="op-actions">
            <button type="button" class="btn primary" id="prisma-generate">Gerar Prisma Client</button>
          </div>
        </div>
      </div>
    </section>`;
}

function renderMlCouponsUrlSection(data: SettingsData): string {
  const value = `
    <div class="channel-inline">
      <code class="coupons-url-preview">${escapeHtml(data.mlCouponsUrl)}</code>
      <div class="channel-actions">
        <button type="button" class="btn btn-sm btn-icon" id="edit-coupons-url" title="Editar URL de cupons">${EDIT_ICON}</button>
      </div>
    </div>`;

  return configRow(
    'URL de cupons ML',
    value,
    'Página do hub de afiliados usada na busca de cupons',
  );
}

function renderChannelSection(data: SettingsData): string {
  const nameBlock = data.channelName
    ? `<span class="channel-name">${escapeHtml(data.channelName)}</span>`
    : data.channelId
      ? '<span class="meta">Nome indisponível</span>'
      : '<span class="badge warn">Não configurado</span>';

  const copyDisabled = data.channelInviteLink ? '' : ' disabled';

  const channelValue = `
    <div class="channel-inline">
      ${nameBlock}
      <div class="channel-actions">
        <button type="button" class="btn btn-sm" id="copy-channel-link"${copyDisabled}>Copiar link</button>
        <button type="button" class="btn btn-sm btn-icon" id="edit-channel-link" title="Editar link">${EDIT_ICON}</button>
        <span class="copy-feedback hidden" id="copy-channel-feedback">Copiado!</span>
      </div>
    </div>
    <input type="hidden" id="channel-invite-link" value="${escapeHtml(data.channelInviteLink)}">`;

  return configRow(
    'Canal WhatsApp',
    channelValue,
    data.channelId ? `ID do canal — <code>${escapeHtml(data.channelId)}</code>` : undefined,
  );
}

export function renderSettingsPage(data: SettingsData): string {
  const statusBadge = data.withinOperatingHours
    ? '<span class="badge ok">Ativo agora</span>'
    : '<span class="badge warn">Fora da janela</span>';

  const alert =
    data.saved === 'channel'
      ? '<p class="alert ok">Link do canal salvo com sucesso.</p>'
      : data.saved === 'interval'
        ? '<p class="alert ok">Intervalo de envio atualizado com sucesso.</p>'
        : data.saved === 'brand'
          ? '<p class="alert ok">Identidade visual atualizada com sucesso.</p>'
          : data.saved === 'score'
            ? '<p class="alert ok">Regras de pontuação atualizadas com sucesso.</p>'
              : data.saved === 'hours'
              ? '<p class="alert ok">Janela operacional atualizada com sucesso.</p>'
              : data.saved === 'senderDelay'
              ? '<p class="alert ok">Tempo entre envios atualizado com sucesso.</p>'
              : data.saved === 'mlSources'
                ? '<p class="alert ok">Fontes ML atualizadas com sucesso.</p>'
                : data.saved === 'couponsUrl'
                  ? '<p class="alert ok">URL de cupons atualizada com sucesso.</p>'
              : data.error
            ? `<p class="alert err">${escapeHtml(data.error)}</p>`
            : '';

  const removeLogoField = data.brandLogoHref
    ? `<label class="modal-checkbox">
        <input type="checkbox" name="removeLogo" value="1" id="modal-remove-logo">
        Remover imagem atual
      </label>`
    : '';

  const body = `
    <style>
      .brand-preview {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .brand-preview-mark {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: #fff;
        font-weight: 800;
        font-size: 1.1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        flex-shrink: 0;
      }
      .brand-preview-mark img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .brand-preview-name {
        font-weight: 700;
        font-size: 1rem;
      }
      .brand-modal-preview {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
        padding: 12px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--surface-2);
      }
      .modal-checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 12px;
        font-size: 0.9rem;
      }
      .score-rules-summary {
        margin-top: 4px;
        line-height: 1.45;
      }
      .score-settings-inline {
        align-items: flex-start;
      }
      .hours-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .hour-input-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .hour-input {
        width: 96px;
        max-width: none;
      }
      .hour-input-suffix {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-muted);
      }
      #operating-hours-modal {
        align-items: center;
      }
      .score-min-row {
        display: flex;
        align-items: flex-end;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 4px;
      }
      .score-min-field {
        flex: 0 0 auto;
      }
      .score-min-input {
        width: 120px;
        max-width: none;
      }
      .score-min-help {
        margin: 0 0 4px;
        flex: 1;
        min-width: 200px;
      }
      .score-categories-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        margin-top: 20px;
      }
      .score-category {
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 18px;
        margin-bottom: 0;
        background: var(--surface-2);
        min-height: 100%;
      }
      .score-category-flag {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 14px;
        cursor: pointer;
        font-size: 0.95rem;
      }
      .score-tier-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .score-tier {
        display: flex;
        align-items: center;
        gap: 14px;
        flex-wrap: nowrap;
      }
      .score-tier-flag {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        flex: 0 0 96px;
      }
      .score-tier-rule {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: nowrap;
        flex: 1;
      }
      .score-tier-label {
        font-size: 0.875rem;
        color: var(--text-muted);
        white-space: nowrap;
      }
      .score-tier-cmp,
      .score-tier-arrow,
      .score-tier-points-label {
        color: var(--text-muted);
        font-size: 0.95rem;
        flex-shrink: 0;
      }
      .score-tier-input {
        width: 80px;
        padding: 8px 10px;
        border: 1px solid var(--border);
        border-radius: 6px;
        background: var(--surface);
        color: var(--text);
        font-size: 0.9rem;
        flex-shrink: 0;
      }
      .score-tier-points {
        width: 72px;
      }
      .score-tier-unit {
        font-size: 0.85rem;
        color: var(--text-muted);
        white-space: nowrap;
        flex-shrink: 0;
        min-width: 48px;
      }
      @media (max-width: 900px) {
        .score-categories-grid {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 760px) {
        .score-tier {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
        .score-tier-rule {
          flex-wrap: wrap;
          padding-left: 26px;
        }
      }
      .config-categories {
        margin-top: 24px;
      }
      .config-categories .subsection-title {
        margin-top: 0;
      }
      .config-categories-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 16px;
      }
      .ml-sources-group-title {
        margin: 20px 0 10px;
        font-size: 0.95rem;
      }
      .ml-sources-custom-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .ml-sources-table {
        width: 100%;
      }
      .ml-source-label {
        font-weight: 600;
      }
      .ml-source-url {
        max-width: 520px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .ml-source-flag {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        white-space: nowrap;
      }
      .ml-source-remove-form {
        margin: 0;
      }
      .connect-section {
        margin-top: 32px;
      }
      .connect-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        margin-top: 16px;
      }
      @media (max-width: 760px) {
        .connect-grid {
          grid-template-columns: 1fr;
        }
      }
      .connect-card {
        display: flex;
        flex-direction: column;
        gap: 16px;
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 18px;
        background: var(--surface-2);
      }
      .connect-card-head {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .connect-card-text {
        flex: 1;
        min-width: 0;
      }
      .connect-icon {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        flex-shrink: 0;
      }
      .connect-icon-ml {
        background: linear-gradient(135deg, #ffe600, #f5c000);
        color: #2d3277;
      }
      .connect-icon-wa {
        background: linear-gradient(135deg, #25d366, #128c7e);
      }
      .connect-icon-worker {
        background: linear-gradient(135deg, #6366f1, #4338ca);
      }
      .connect-icon-telegram {
        background: linear-gradient(135deg, #2aabee, #229ed9);
      }
      .connect-icon-prisma {
        background: linear-gradient(135deg, #4f46e5, #0f172a);
      }
      .op-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .btn-danger {
        border-color: rgba(220, 38, 38, 0.45);
        color: var(--danger, #dc2626);
      }
      .btn-danger:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .op-output {
        margin: 12px 0 0;
        padding: 12px;
        border-radius: 8px;
        background: #0d1117;
        color: #c9d1d9;
        border: 1px solid #30363d;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 0.78rem;
        line-height: 1.5;
        max-height: 320px;
        overflow: auto;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .op-output:empty {
        display: none;
      }
      .connect-name {
        font-weight: 700;
        font-size: 1rem;
      }
      .connect-detail {
        margin-top: 2px;
        word-break: break-word;
      }
      .connect-btn {
        align-self: flex-start;
      }
      .connect-steps {
        margin: 12px 0 0;
        padding-left: 20px;
        line-height: 1.6;
        color: var(--text-muted);
        font-size: 0.9rem;
      }
      .connect-status {
        font-weight: 600;
        margin: 0;
      }
      .connect-error {
        color: var(--danger, #dc2626);
        font-size: 0.9rem;
        margin: 12px 0 0;
      }
      .wa-qr-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        margin-top: 16px;
      }
      .wa-qr-wrap img {
        border: 8px solid #fff;
        border-radius: 8px;
        background: #fff;
      }
      .hidden {
        display: none;
      }
      .coupons-url-preview {
        word-break: break-all;
        font-size: 0.85rem;
      }
    </style>
    ${alert}
    <section>
      <h2>Configuração</h2>

      <div class="config-grid">
        ${renderBrandSection(data)}
        ${configRow('Fuso', `<code>${escapeHtml(data.timezone)}</code>`, 'APP_TIMEZONE')}
        ${renderOperatingHoursSection(data, statusBadge)}
        ${renderScoreSection(data)}
        ${configRow(
          'Intervalo de coleta',
          renderEditableValue('intervalo de coleta', `${data.collectorIntervalMinutes} min`, 'edit-send-interval'),
          'Frequência de busca de novas ofertas',
        )}
        ${configRow(
          'Tempo entre envios',
          renderEditableValue('tempo entre envios', `${data.senderDelayMinutes} min`, 'edit-sender-delay'),
          'Intervalo entre cada mensagem enviada no WhatsApp',
        )}
        ${renderChannelSection(data)}
        ${renderMlCouponsUrlSection(data)}
        ${renderSourcesPointer(data)}
      </div>
    </section>

    ${renderConnectionsSection(data)}

    ${renderOperationsSection(data)}

    <div id="prisma-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="prisma-modal-title">
        <div class="modal-header">
          <h3 id="prisma-modal-title">Gerar Prisma Client</h3>
        </div>
        <div class="modal-body">
          <p class="connect-status" id="prisma-status">Executando <code>prisma generate</code>…</p>
          <pre class="op-output" id="prisma-output"></pre>
          <p class="connect-error hidden" id="prisma-error"></p>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" id="prisma-close">Fechar</button>
        </div>
      </div>
    </div>

    <div id="ml-connect-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="ml-connect-modal-title">
        <div class="modal-header">
          <h3 id="ml-connect-modal-title">Conectar ao Mercado Livre</h3>
        </div>
        <div class="modal-body">
          <div class="connect-flow" id="ml-connect-flow">
            <p class="connect-status" id="ml-connect-status">Abrindo o navegador…</p>
            <ol class="connect-steps" id="ml-connect-steps">
              <li>Uma janela do navegador vai abrir no portal de afiliados do Mercado Livre.</li>
              <li>Faça login normalmente e acesse o <strong>Gerador de Links</strong>.</li>
              <li>Volte aqui e clique em <strong>Concluir</strong> para salvar a sessão.</li>
            </ol>
            <p class="connect-error hidden" id="ml-connect-error"></p>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" id="ml-connect-cancel">Cancelar</button>
          <button type="button" class="btn primary" id="ml-connect-finish" disabled>Concluir</button>
        </div>
      </div>
    </div>

    <div id="wa-connect-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="wa-connect-modal-title">
        <div class="modal-header">
          <h3 id="wa-connect-modal-title">Conectar ao WhatsApp</h3>
        </div>
        <div class="modal-body">
          <div class="connect-flow" id="wa-connect-flow">
            <p class="connect-status" id="wa-connect-status">Iniciando conexão…</p>
            <div class="wa-qr-wrap hidden" id="wa-qr-wrap">
              <img id="wa-qr-img" alt="QR code do WhatsApp" width="280" height="280">
              <p class="modal-help">No celular, abra o WhatsApp › <strong>Aparelhos conectados</strong> › <strong>Conectar um aparelho</strong> e aponte a câmera para o QR acima.</p>
            </div>
            <p class="connect-error hidden" id="wa-connect-error"></p>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" id="wa-connect-close">Fechar</button>
        </div>
      </div>
    </div>

    <div id="coupons-url-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="coupons-url-modal-title">
        <div class="modal-header">
          <h3 id="coupons-url-modal-title">Editar URL de cupons</h3>
        </div>
        <form method="post" action="/manager/settings/coupons-url">
          <div class="modal-body">
            <label for="modal-coupons-url" class="modal-label">URL do hub de cupons</label>
            <input
              type="url"
              id="modal-coupons-url"
              name="couponsUrl"
              value="${escapeHtml(data.mlCouponsUrl)}"
              required
              class="modal-input"
            >
            <p class="modal-help">Ex.: https://www.mercadolivre.com.br/afiliados/coupons#hub</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn modal-cancel" data-modal="coupons-url-modal">Cancelar</button>
            <button type="submit" class="btn primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>

    <div id="channel-link-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="channel-link-modal-title">
        <div class="modal-header">
          <h3 id="channel-link-modal-title">Editar link do canal</h3>
        </div>
        <form method="post" action="/manager/settings/channel-link">
          <div class="modal-body">
            <label for="modal-invite-link" class="modal-label">Link de compartilhamento</label>
            <input
              type="url"
              id="modal-invite-link"
              name="inviteLink"
              value="${escapeHtml(data.channelInviteLink)}"
              placeholder="https://whatsapp.com/channel/..."
              spellcheck="false"
              class="modal-input"
            >
            <p class="modal-help">Cole o link de convite do seu canal WhatsApp.</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn modal-cancel" data-modal="channel-link-modal">Cancelar</button>
            <button type="submit" class="btn primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>

    <div id="operating-hours-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="operating-hours-modal-title">
        <div class="modal-header">
          <h3 id="operating-hours-modal-title">Editar janela operacional</h3>
        </div>
        <form method="post" action="/manager/settings/operating-hours">
          <div class="modal-body">
            <div class="hours-row">
              <div>
                <label for="modal-start-hour" class="modal-label">Início</label>
                ${renderHourInput('startHour', 'modal-start-hour', data.operatingHours.start, 'start')}
              </div>
              <div>
                <label for="modal-end-hour" class="modal-label">Fim</label>
                ${renderHourInput('endHour', 'modal-end-hour', endHourForForm(data.operatingHours.end), 'end')}
              </div>
            </div>
            <p class="modal-help">O bot só coleta e envia ofertas dentro deste intervalo (fuso: ${escapeHtml(data.timezone)}). Informe a hora cheia — ex.: 9 = 09:00. Use 24 como fim do dia.</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn modal-cancel" data-modal="operating-hours-modal">Cancelar</button>
            <button type="submit" class="btn primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>

    <div id="send-interval-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="send-interval-modal-title">
        <div class="modal-header">
          <h3 id="send-interval-modal-title">Editar intervalo de envio</h3>
        </div>
        <form method="post" action="/manager/settings/send-interval">
          <div class="modal-body">
            <label for="modal-interval-minutes" class="modal-label">Intervalo (minutos)</label>
            <input
              type="number"
              id="modal-interval-minutes"
              name="intervalMinutes"
              value="${data.collectorIntervalMinutes}"
              min="1"
              max="1440"
              step="1"
              required
              class="modal-input"
            >
            <p class="modal-help">Define de quanto em quanto tempo o bot busca e envia novas ofertas (1 a 1440 min).</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn modal-cancel" data-modal="send-interval-modal">Cancelar</button>
            <button type="submit" class="btn primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>

    <div id="sender-delay-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="sender-delay-modal-title">
        <div class="modal-header">
          <h3 id="sender-delay-modal-title">Editar tempo entre envios</h3>
        </div>
        <form method="post" action="/manager/settings/sender-delay">
          <div class="modal-body">
            <label for="modal-sender-delay-minutes" class="modal-label">Intervalo (minutos)</label>
            <input
              type="number"
              id="modal-sender-delay-minutes"
              name="senderDelayMinutes"
              value="${data.senderDelayMinutes}"
              min="0"
              max="1440"
              step="1"
              required
              class="modal-input"
            >
            <p class="modal-help">Tempo de espera entre cada oferta enviada no WhatsApp (0 a 1440 min). Use 0 para envio imediato.</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn modal-cancel" data-modal="sender-delay-modal">Cancelar</button>
            <button type="submit" class="btn primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>

    <div id="score-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-score" role="dialog" aria-modal="true" aria-labelledby="score-modal-title">
        <div class="modal-header">
          <h3 id="score-modal-title">Editar pontuação</h3>
        </div>
        <form method="post" action="/manager/settings/score">
          <div class="modal-body">
            <div class="score-min-row">
              <div class="score-min-field">
                <label for="modal-min-score" class="modal-label">Score mínimo para aceitar oferta</label>
                <input
                  type="number"
                  id="modal-min-score"
                  name="minScore"
                  value="${data.minScore}"
                  min="0"
                  step="1"
                  required
                  class="modal-input score-min-input"
                >
              </div>
              <p class="modal-help score-min-help">Ofertas com score abaixo deste valor são descartadas.</p>
            </div>
            <div class="score-categories-grid">
              ${SCORE_CATEGORY_KEYS.map((key) => renderScoreCategoryBlock(key, data)).join('')}
            </div>
            <p class="modal-help">Use as flags para ativar/desativar categorias e faixas. Em cada categoria, só a melhor faixa aplicável conta — exceto em Preço, onde as faixas podem somar.</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn modal-cancel" data-modal="score-modal">Cancelar</button>
            <button type="submit" class="btn primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>

    <div id="brand-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="brand-modal-title">
        <div class="modal-header">
          <h3 id="brand-modal-title">Editar identidade visual</h3>
        </div>
        <form method="post" action="/manager/settings/brand" id="brand-form">
          <div class="modal-body">
            <div class="brand-modal-preview">
              <div class="brand-preview-mark" id="modal-brand-mark">${
                data.brandLogoHref
                  ? `<img src="${escapeHtml(data.brandLogoHref)}" alt="" id="modal-brand-img">`
                  : escapeHtml(data.brandInitial)
              }</div>
              <div>
                <div class="brand-preview-name" id="modal-brand-name-preview">${escapeHtml(data.brandName)}</div>
                <div class="meta" id="modal-brand-sub-preview">${escapeHtml(data.brandSubtitle)}</div>
              </div>
            </div>
            <label for="modal-brand-name" class="modal-label">Nome do painel</label>
            <input
              type="text"
              id="modal-brand-name"
              name="brandName"
              value="${escapeHtml(data.brandName)}"
              maxlength="80"
              required
              class="modal-input"
            >
            <label for="modal-brand-subtitle" class="modal-label">Subtítulo</label>
            <input
              type="text"
              id="modal-brand-subtitle"
              name="brandSubtitle"
              value="${escapeHtml(data.brandSubtitle)}"
              maxlength="120"
              class="modal-input"
            >
            <label for="modal-brand-logo-file" class="modal-label">Imagem do ícone</label>
            <input type="file" id="modal-brand-logo-file" accept="image/png,image/jpeg,image/webp,image/gif">
            <input type="hidden" name="logoData" id="modal-brand-logo-data" value="">
            ${removeLogoField}
            <p class="modal-help">A imagem é salva em base64 no arquivo de configuração. Se nenhuma for definida, será exibida a inicial do nome.</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn modal-cancel" data-modal="brand-modal">Cancelar</button>
            <button type="submit" class="btn primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>

    <script>
      const linkInput = document.getElementById('channel-invite-link');
      const channelModal = document.getElementById('channel-link-modal');
      const couponsUrlModal = document.getElementById('coupons-url-modal');
      const operatingHoursModal = document.getElementById('operating-hours-modal');
      const intervalModal = document.getElementById('send-interval-modal');
      const senderDelayModal = document.getElementById('sender-delay-modal');
      const scoreModal = document.getElementById('score-modal');
      const brandModal = document.getElementById('brand-modal');
      const modalInviteInput = document.getElementById('modal-invite-link');
      const modalIntervalInput = document.getElementById('modal-interval-minutes');
      const modalBrandName = document.getElementById('modal-brand-name');
      const modalBrandSubtitle = document.getElementById('modal-brand-subtitle');
      const modalBrandMark = document.getElementById('modal-brand-mark');
      const modalBrandNamePreview = document.getElementById('modal-brand-name-preview');
      const modalBrandSubPreview = document.getElementById('modal-brand-sub-preview');
      const modalBrandLogoFile = document.getElementById('modal-brand-logo-file');
      const modalBrandLogoData = document.getElementById('modal-brand-logo-data');
      const modalRemoveLogo = document.getElementById('modal-remove-logo');
      const copyBtn = document.getElementById('copy-channel-link');
      const copyFeedback = document.getElementById('copy-channel-feedback');
      const brandInitial = ${JSON.stringify(data.brandInitial)};
      const brandLogoData = ${JSON.stringify(data.brandLogoHref ?? '')};

      function openModal(modal) {
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        const focusable = modal.querySelector('input, button, textarea, select');
        focusable?.focus();
      }

      function closeModal(modal) {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        if (document.querySelectorAll('.modal-overlay:not(.hidden)').length === 0) {
          document.body.style.overflow = '';
        }
      }

      document.getElementById('edit-coupons-url')?.addEventListener('click', () => {
        openModal(couponsUrlModal);
      });

      document.getElementById('edit-channel-link')?.addEventListener('click', () => {
        modalInviteInput.value = linkInput?.value || '';
        openModal(channelModal);
      });

      document.getElementById('edit-operating-hours')?.addEventListener('click', () => {
        openModal(operatingHoursModal);
      });

      document.getElementById('edit-send-interval')?.addEventListener('click', () => {
        openModal(intervalModal);
      });

      document.getElementById('edit-sender-delay')?.addEventListener('click', () => {
        openModal(senderDelayModal);
      });

      document.getElementById('edit-score')?.addEventListener('click', () => {
        openModal(scoreModal);
      });

      document.getElementById('edit-brand')?.addEventListener('click', () => {
        modalBrandLogoData.value = brandLogoData;
        modalBrandLogoFile.value = '';
        if (modalRemoveLogo) modalRemoveLogo.checked = false;
        updateBrandPreview();
        openModal(brandModal);
      });

      function updateBrandPreview() {
        const name = modalBrandName?.value?.trim() || 'R';
        const subtitle = modalBrandSubtitle?.value?.trim() || '';
        modalBrandNamePreview.textContent = name;
        modalBrandSubPreview.textContent = subtitle;

        const logoData = modalBrandLogoData?.value?.trim();
        const removeLogo = modalRemoveLogo?.checked;

        if (removeLogo) {
          modalBrandMark.innerHTML = name.charAt(0).toUpperCase();
          return;
        }
        if (logoData) {
          modalBrandMark.innerHTML = '<img src="' + logoData + '" alt="">';
          return;
        }
        if (brandLogoData && !removeLogo) {
          modalBrandMark.innerHTML = '<img src="' + brandLogoData + '" alt="">';
          return;
        }
        modalBrandMark.innerHTML = name.charAt(0).toUpperCase() || brandInitial;
      }

      modalBrandName?.addEventListener('input', updateBrandPreview);
      modalBrandSubtitle?.addEventListener('input', updateBrandPreview);
      modalRemoveLogo?.addEventListener('change', updateBrandPreview);

      modalBrandLogoFile?.addEventListener('change', () => {
        const file = modalBrandLogoFile.files?.[0];
        if (!file) return;
        if (modalRemoveLogo) modalRemoveLogo.checked = false;
        const reader = new FileReader();
        reader.onload = () => {
          modalBrandLogoData.value = typeof reader.result === 'string' ? reader.result : '';
          updateBrandPreview();
        };
        reader.readAsDataURL(file);
      });

      document.querySelectorAll('.modal-cancel').forEach((btn) => {
        btn.addEventListener('click', () => {
          const modal = document.getElementById(btn.getAttribute('data-modal'));
          if (modal) closeModal(modal);
        });
      });

      [channelModal, couponsUrlModal, operatingHoursModal, intervalModal, senderDelayModal, scoreModal, brandModal].forEach((modal) => {
        modal?.addEventListener('click', (e) => {
          if (e.target === modal) closeModal(modal);
        });
      });

      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        [channelModal, couponsUrlModal, operatingHoursModal, intervalModal, senderDelayModal, scoreModal, brandModal].forEach((modal) => {
          if (!modal.classList.contains('hidden')) closeModal(modal);
        });
      });

      copyBtn?.addEventListener('click', async () => {
        const link = linkInput?.value?.trim();
        if (!link) return;

        try {
          await navigator.clipboard.writeText(link);
        } catch {
          const tmp = document.createElement('textarea');
          tmp.value = link;
          document.body.appendChild(tmp);
          tmp.select();
          document.execCommand('copy');
          document.body.removeChild(tmp);
        }

        copyFeedback?.classList.remove('hidden');
        setTimeout(() => copyFeedback?.classList.add('hidden'), 2000);
      });

      // --- Conectar com: Mercado Livre ---
      const mlConnectBtn = document.getElementById('connect-ml');
      const mlModal = document.getElementById('ml-connect-modal');
      const mlStatusEl = document.getElementById('ml-connect-status');
      const mlErrorEl = document.getElementById('ml-connect-error');
      const mlFinishBtn = document.getElementById('ml-connect-finish');
      const mlCancelBtn = document.getElementById('ml-connect-cancel');
      let mlPollTimer = null;

      function stopMlPoll() {
        if (mlPollTimer) { clearInterval(mlPollTimer); mlPollTimer = null; }
      }

      function renderMlState(state) {
        mlErrorEl.classList.add('hidden');
        if (state.error) {
          mlErrorEl.textContent = state.error;
          mlErrorEl.classList.remove('hidden');
        }
        switch (state.status) {
          case 'opening':
            mlStatusEl.textContent = 'Abrindo o navegador…';
            mlFinishBtn.disabled = true;
            break;
          case 'awaiting-login':
            mlStatusEl.textContent = 'Navegador aberto. Faça login e clique em Concluir.';
            mlFinishBtn.disabled = false;
            break;
          case 'saving':
            mlStatusEl.textContent = 'Salvando sessão…';
            mlFinishBtn.disabled = true;
            break;
          case 'connected':
            mlStatusEl.textContent = 'Sessão do Mercado Livre salva com sucesso! ✅';
            mlFinishBtn.disabled = true;
            stopMlPoll();
            setTimeout(() => location.reload(), 1200);
            break;
          case 'error':
            mlStatusEl.textContent = 'Não foi possível conectar.';
            mlFinishBtn.disabled = true;
            stopMlPoll();
            break;
        }
      }

      async function pollMl() {
        try {
          const res = await fetch('/manager/settings/connect/ml/status');
          if (res.ok) renderMlState(await res.json());
        } catch (_) {}
      }

      async function cancelMl() {
        stopMlPoll();
        closeModal(mlModal);
        try { await fetch('/manager/settings/connect/ml/cancel', { method: 'POST' }); } catch (_) {}
      }

      mlConnectBtn?.addEventListener('click', async () => {
        openModal(mlModal);
        mlStatusEl.textContent = 'Abrindo o navegador…';
        mlErrorEl.classList.add('hidden');
        mlFinishBtn.disabled = true;
        try {
          const res = await fetch('/manager/settings/connect/ml/start', { method: 'POST' });
          if (res.ok) renderMlState(await res.json());
        } catch (_) {}
        stopMlPoll();
        mlPollTimer = setInterval(pollMl, 1500);
      });

      mlFinishBtn?.addEventListener('click', async () => {
        mlStatusEl.textContent = 'Salvando sessão…';
        mlFinishBtn.disabled = true;
        try {
          const res = await fetch('/manager/settings/connect/ml/finish', { method: 'POST' });
          if (res.ok) renderMlState(await res.json());
        } catch (_) {}
      });

      mlCancelBtn?.addEventListener('click', cancelMl);
      mlModal?.addEventListener('click', (e) => { if (e.target === mlModal) cancelMl(); });

      // --- Conectar com: WhatsApp ---
      const waConnectBtn = document.getElementById('connect-wa');
      const waModal = document.getElementById('wa-connect-modal');
      const waStatusEl = document.getElementById('wa-connect-status');
      const waErrorEl = document.getElementById('wa-connect-error');
      const waQrWrap = document.getElementById('wa-qr-wrap');
      const waQrImg = document.getElementById('wa-qr-img');
      const waCloseBtn = document.getElementById('wa-connect-close');
      let waPollTimer = null;
      let waLastQr = '';

      function stopWaPoll() {
        if (waPollTimer) { clearInterval(waPollTimer); waPollTimer = null; }
      }

      function renderWaState(state) {
        waErrorEl.classList.add('hidden');
        switch (state.status) {
          case 'connecting':
            waStatusEl.textContent = 'Iniciando conexão…';
            waQrWrap.classList.add('hidden');
            break;
          case 'qr':
            waStatusEl.textContent = 'Escaneie o QR code com o WhatsApp:';
            if (state.qr && state.qr !== waLastQr) {
              waLastQr = state.qr;
              waQrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=' + encodeURIComponent(state.qr);
            }
            waQrWrap.classList.remove('hidden');
            break;
          case 'connected':
            waStatusEl.textContent = 'WhatsApp conectado com sucesso! ✅';
            waQrWrap.classList.add('hidden');
            stopWaPoll();
            setTimeout(() => location.reload(), 1200);
            break;
          case 'error':
            waStatusEl.textContent = 'Não foi possível conectar.';
            waQrWrap.classList.add('hidden');
            if (state.error) {
              waErrorEl.textContent = state.error;
              waErrorEl.classList.remove('hidden');
            }
            stopWaPoll();
            break;
        }
      }

      async function pollWa() {
        try {
          const res = await fetch('/manager/settings/connect/wa/status');
          if (res.ok) renderWaState(await res.json());
        } catch (_) {}
      }

      waConnectBtn?.addEventListener('click', async () => {
        openModal(waModal);
        waStatusEl.textContent = 'Iniciando conexão…';
        waErrorEl.classList.add('hidden');
        waQrWrap.classList.add('hidden');
        waLastQr = '';
        try {
          const res = await fetch('/manager/settings/connect/wa/start', { method: 'POST' });
          if (res.ok) renderWaState(await res.json());
        } catch (_) {}
        stopWaPoll();
        waPollTimer = setInterval(pollWa, 1500);
      });

      waCloseBtn?.addEventListener('click', () => { stopWaPoll(); closeModal(waModal); });
      waModal?.addEventListener('click', (e) => { if (e.target === waModal) { stopWaPoll(); closeModal(waModal); } });

      // --- Conectar com: Telegram (só reverifica; config é do .env) ---
      const tgConnectBtn = document.getElementById('connect-telegram');
      const tgConnectBadge = document.getElementById('telegram-connect-badge');
      const tgConnectDetail = document.getElementById('telegram-connect-detail');

      tgConnectBtn?.addEventListener('click', async () => {
        tgConnectBtn.disabled = true;
        tgConnectDetail.textContent = 'Verificando conexão com o Telegram…';
        try {
          const res = await fetch('/manager/settings/connect/telegram/status');
          if (res.ok) {
            const state = await res.json();
            tgConnectBadge.innerHTML = state.ok
              ? '<span class="badge ok">Conectado</span>'
              : '<span class="badge warn">Desconectado</span>';
            tgConnectDetail.textContent = state.detail;
          } else {
            tgConnectDetail.textContent = 'Não foi possível verificar agora.';
          }
        } catch (_) {
          tgConnectDetail.textContent = 'Não foi possível verificar agora.';
        }
        tgConnectBtn.disabled = false;
      });

      // --- Operações: Workers de envio (um card por canal) ---
      function workerBadgeHtml(status) {
        if (status === 'running') return '<span class="badge ok">Rodando</span>';
        if (status === 'starting') return '<span class="badge warn">Iniciando…</span>';
        if (status === 'error') return '<span class="badge err">Erro</span>';
        return '<span class="badge warn">Parado</span>';
      }

      // Cada canal tem seu card, seus botões e seu polling — o ?channel= diz ao
      // painel qual processo controlar. O card do Telegram só existe quando o
      // canal está ligado, então saímos fora se os elementos não estiverem lá.
      function setupWorkerCard(prefix, channel) {
        const startBtn = document.getElementById(prefix + '-start');
        const restartBtn = document.getElementById(prefix + '-restart');
        const stopBtn = document.getElementById(prefix + '-stop');
        const badge = document.getElementById(prefix + '-badge');
        const detail = document.getElementById(prefix + '-detail');
        if (!startBtn || !badge || !detail) return;

        const query = channel ? '?channel=' + channel : '';
        let pollTimer = null;

        function render(state) {
          const running = state.status === 'running' || state.status === 'starting';
          badge.innerHTML = workerBadgeHtml(state.status);
          if (state.detail) detail.textContent = state.detail;
          else detail.textContent = running ? 'Processo de envio em execução' : 'Processo de envio parado';
          startBtn.disabled = running;
          if (stopBtn) stopBtn.disabled = !running;
        }

        async function poll() {
          try {
            const res = await fetch('/manager/settings/worker/status' + query);
            if (res.ok) render(await res.json());
          } catch (_) {}
        }

        function ensurePoll() {
          if (pollTimer) return;
          pollTimer = setInterval(poll, 2500);
        }

        async function action(endpoint, pending) {
          [startBtn, restartBtn, stopBtn].forEach((b) => { if (b) b.disabled = true; });
          detail.textContent = pending;
          try {
            const res = await fetch(endpoint + query, { method: 'POST' });
            if (res.ok) render(await res.json());
          } catch (_) {}
          ensurePoll();
          setTimeout(poll, 600);
        }

        startBtn.addEventListener('click', () => action('/manager/settings/worker/start', 'Iniciando worker…'));
        restartBtn?.addEventListener('click', () => action('/manager/settings/worker/restart', 'Reiniciando worker…'));
        stopBtn?.addEventListener('click', () => action('/manager/settings/worker/stop', 'Parando worker…'));
        ensurePoll();
      }

      setupWorkerCard('worker', 'whatsapp');
      setupWorkerCard('worker-tg', 'telegram');

      // --- Operações: Prisma generate ---
      const prismaBtn = document.getElementById('prisma-generate');
      const prismaModal = document.getElementById('prisma-modal');
      const prismaStatusEl = document.getElementById('prisma-status');
      const prismaOutputEl = document.getElementById('prisma-output');
      const prismaErrorEl = document.getElementById('prisma-error');
      const prismaCloseBtn = document.getElementById('prisma-close');
      let prismaPollTimer = null;

      function stopPrismaPoll() {
        if (prismaPollTimer) { clearInterval(prismaPollTimer); prismaPollTimer = null; }
      }

      function renderPrismaState(state) {
        prismaErrorEl.classList.add('hidden');
        prismaOutputEl.textContent = state.output || '';
        switch (state.status) {
          case 'running':
            prismaStatusEl.textContent = 'Executando prisma generate…';
            break;
          case 'done':
            prismaStatusEl.textContent = 'Prisma Client gerado com sucesso! ✅';
            stopPrismaPoll();
            break;
          case 'error':
            prismaStatusEl.textContent = 'Falha ao gerar o Prisma Client.';
            if (state.error) { prismaErrorEl.textContent = state.error; prismaErrorEl.classList.remove('hidden'); }
            stopPrismaPoll();
            break;
          default:
            prismaStatusEl.textContent = 'Pronto para executar.';
        }
      }

      async function pollPrisma() {
        try {
          const res = await fetch('/manager/settings/prisma/status');
          if (res.ok) renderPrismaState(await res.json());
        } catch (_) {}
      }

      prismaBtn?.addEventListener('click', async () => {
        openModal(prismaModal);
        prismaStatusEl.textContent = 'Executando prisma generate…';
        prismaOutputEl.textContent = '';
        prismaErrorEl.classList.add('hidden');
        try {
          const res = await fetch('/manager/settings/prisma/generate', { method: 'POST' });
          if (res.ok) renderPrismaState(await res.json());
        } catch (_) {}
        stopPrismaPoll();
        prismaPollTimer = setInterval(pollPrisma, 1200);
      });

      prismaCloseBtn?.addEventListener('click', () => { stopPrismaPoll(); closeModal(prismaModal); });
      prismaModal?.addEventListener('click', (e) => { if (e.target === prismaModal) { stopPrismaPoll(); closeModal(prismaModal); } });
    </script>`;

  return renderLayout('Configuração', body, 'settings');
}
