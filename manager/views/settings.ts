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

function renderMlCategoriesSection(data: SettingsData): string {
  const rows = data.categories.length === 0
    ? '<tr><td colspan="3">Nenhuma categoria configurada.</td></tr>'
    : data.categories
        .map(
          (category) =>
            `<tr>
              <td>${escapeHtml(category.category)}</td>
              <td>${category.valid ? '<span class="badge ok">OK</span>' : '<span class="badge err">Inválida</span>'}</td>
              <td>${escapeHtml(category.reason ?? category.listingKind)}</td>
            </tr>`,
        )
        .join('');

  return `
    <div class="config-categories">
      <h3 class="subsection-title">Categorias ML</h3>
      <p class="meta">Fontes de busca definidas em <code>ML_CATEGORIES</code> no <code>.env</code>.</p>
      <table>
        <thead><tr><th>Categoria / URL</th><th>Status</th><th>Info</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
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
    </style>
    ${alert}
    <section>
      <h2>Configuração</h2>
      <p class="meta">Alguns valores podem ser editados aqui. Outros vêm do <code>.env</code>.</p>

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
      </div>
      ${renderMlCategoriesSection(data)}
    </section>

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

      [channelModal, operatingHoursModal, intervalModal, senderDelayModal, scoreModal, brandModal].forEach((modal) => {
        modal?.addEventListener('click', (e) => {
          if (e.target === modal) closeModal(modal);
        });
      });

      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        [channelModal, operatingHoursModal, intervalModal, senderDelayModal, scoreModal, brandModal].forEach((modal) => {
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
    </script>`;

  return renderLayout('Configuração', body, 'settings');
}
