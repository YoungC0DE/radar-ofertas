import type { TemplatePageData } from '../models/template-model.js';
import {
  getAutoMessageDailyTimeValue,
  getAutoMessagePreview,
  getAutoMessageScheduleLabel,
  getAutoMessageScheduledInputValue,
  getPlaceholderHelp,
} from '../models/template-model.js';
import { escapeHtml, formatDate } from './helpers.js';
import { renderLayout } from './layout.js';
import { env } from '../../src/config/env.js';
import type { AutoMessageRecord } from '../../src/auto-messages/types.js';

function placeholderChips(visibility: TemplatePageData['placeholderVisibility']): string {
  return getPlaceholderHelp()
    .filter((p) => visibility[p.key])
    .map(
      (p) =>
        `<button type="button" class="chip" data-placeholder="{{${p.key}}}" title="${escapeHtml(p.label)}">{{${p.key}}}</button>`,
    )
    .join('\n');
}

function placeholderTable(visibility: TemplatePageData['placeholderVisibility']): string {
  return getPlaceholderHelp()
    .map((p) => {
      const checked = visibility[p.key] ? ' checked' : '';
      return `<tr>
          <td>
            <label class="placeholder-flag">
              <input type="checkbox" name="placeholder_${p.key}" value="1" data-placeholder-key="${p.key}" class="placeholder-toggle"${checked}>
              <span>${visibility[p.key] ? 'Ativo' : 'Off'}</span>
            </label>
          </td>
          <td><code>{{${escapeHtml(p.key)}}}</code></td>
          <td>${escapeHtml(p.label)}</td>
          <td class="meta">${escapeHtml(p.example)}</td>
        </tr>`;
    })
    .join('');
}

function scheduleFields(message?: AutoMessageRecord): string {
  const scheduleType = message?.scheduleType ?? 'manual';
  const scheduledValue = message ? getAutoMessageScheduledInputValue(message) : '';
  const dailyTime = message ? getAutoMessageDailyTimeValue(message) : '08:00';

  return `
    <fieldset class="schedule-fieldset">
      <legend>Agendamento</legend>
      <div class="schedule-options">
        <label class="schedule-option">
          <input type="radio" name="scheduleType" value="manual"${scheduleType === 'manual' ? ' checked' : ''}>
          <span>Sem agendamento</span>
          <small>Salva a mensagem — envie manualmente com o botão abaixo</small>
        </label>
        <label class="schedule-option">
          <input type="radio" name="scheduleType" value="once"${scheduleType === 'once' ? ' checked' : ''}>
          <span>Enviar uma vez em</span>
          <input type="datetime-local" name="scheduledAt" value="${escapeHtml(scheduledValue)}" class="schedule-once-input"${scheduleType !== 'once' ? ' disabled' : ''}>
        </label>
        <label class="schedule-option">
          <input type="radio" name="scheduleType" value="daily"${scheduleType === 'daily' ? ' checked' : ''}>
          <span>Repetir todo dia às</span>
          <input type="time" name="dailyTime" value="${escapeHtml(dailyTime)}" class="schedule-daily-input"${scheduleType !== 'daily' ? ' disabled' : ''}>
        </label>
      </div>
    </fieldset>`;
}

function autoMessageCard(message: AutoMessageRecord): string {
  const preview = getAutoMessagePreview(message.content);
  const scheduleLabel = getAutoMessageScheduleLabel(message);

  return `
    <article class="auto-message-card" data-auto-message-card>
      <form method="post" action="/manager/template/auto-message/${escapeHtml(message.id)}">
        <div class="auto-message-header">
          <input type="text" name="title" value="${escapeHtml(message.title)}" class="auto-title" placeholder="Título (ex: Bom dia)">
          <span class="badge schedule-badge">${escapeHtml(scheduleLabel)}</span>
        </div>

        <label>Texto da mensagem</label>
        <textarea name="content" rows="6" spellcheck="false">${escapeHtml(message.content)}</textarea>

        <div class="auto-message-meta">
          <pre class="preview-box auto-preview">${escapeHtml(preview)}</pre>
          ${message.lastSentAt ? `<p class="meta">Último envio: ${formatDate(message.lastSentAt, env.APP_TIMEZONE)}</p>` : ''}
        </div>

        ${scheduleFields(message)}

        <label class="enabled-field">
          <input type="checkbox" name="enabled" value="1"${message.enabled ? ' checked' : ''}>
          Agendamento ativo
        </label>

        <div class="form-actions">
          <button type="submit" class="btn primary">Salvar e programar</button>
        </div>
      </form>

      <div class="form-actions auto-actions">
        <form method="post" action="/manager/template/auto-message/${escapeHtml(message.id)}/send" class="inline-form">
          <button type="submit" class="btn">Enviar agora</button>
        </form>
        <form method="post" action="/manager/template/auto-message/${escapeHtml(message.id)}/delete" class="inline-form">
          <button type="submit" class="btn danger" data-confirm-delete>Excluir</button>
        </form>
      </div>
    </article>`;
}

function renderAutoMessagesSection(data: TemplatePageData): string {
  const placeholders = data.autoMessagePlaceholders
    .map(
      (p) =>
        `<tr><td><code>{{${escapeHtml(p.key)}}}</code></td><td>${escapeHtml(p.label)}</td><td class="meta">${escapeHtml(p.example)}</td></tr>`,
    )
    .join('');

  const cards =
    data.autoMessages.length > 0
      ? data.autoMessages.map(autoMessageCard).join('')
      : '<p class="meta">Nenhuma mensagem automática ainda. Crie uma abaixo.</p>';

  return `
    <section class="auto-messages-section">
      <h2>Mensagens automáticas</h2>
      <p class="meta">
        Crie textos como bom dia, código promocional ou avisos. Salve a mensagem, escolha o horário de envio
        e clique em <strong>Salvar e programar</strong> — o bot envia automaticamente no horário definido.
      </p>

      <div class="auto-messages-list">${cards}</div>

      <article class="auto-message-card new-auto-message" data-auto-message-card>
        <h3>Nova mensagem</h3>
        <form method="post" action="/manager/template/auto-message">
          <label>Título</label>
          <input type="text" name="title" placeholder="Ex: Bom dia" required>

          <label>Texto</label>
          <textarea name="content" rows="6" placeholder="Bom dia! ☀️ Confira as ofertas de hoje no {{brand}}." required></textarea>

          ${scheduleFields()}

          <div class="form-actions">
            <button type="submit" class="btn primary">Salvar e programar</button>
          </div>
        </form>
      </article>

      <table class="auto-placeholders">
        <thead><tr><th>Código</th><th>Significado</th><th>Exemplo</th></tr></thead>
        <tbody>${placeholders}</tbody>
      </table>
    </section>`;
}

export function renderTemplatePage(data: TemplatePageData): string {
  const alert = data.saved
    ? '<p class="alert ok">Template salvo com sucesso. Novas mensagens do bot usarão este texto.</p>'
    : data.autoMessageNotice
      ? `<p class="alert ok">${escapeHtml(data.autoMessageNotice)}</p>`
      : data.error
        ? `<p class="alert err">${escapeHtml(data.error)}</p>`
        : '';

  const offerNote = data.previewOffer
    ? `<p class="meta">Preview com a oferta mais recente: <strong>${escapeHtml(data.previewOffer.title.slice(0, 50))}${data.previewOffer.title.length > 50 ? '…' : ''}</strong></p>`
    : '<p class="meta">Nenhuma oferta salva ainda — preview usa dados de exemplo.</p>';

  const body = `
    <style>
      .placeholder-flag {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 600;
      }
      .placeholder-flag input {
        width: 16px;
        height: 16px;
        cursor: pointer;
      }
      .placeholder-flag span {
        min-width: 40px;
        color: var(--text-muted);
      }
      .placeholder-flag:has(input:checked) span {
        color: #166534;
      }
      .chip-row:empty::before {
        content: 'Nenhum placeholder ativo — ative flags abaixo.';
        color: var(--text-muted);
        font-size: 0.85rem;
      }
      .placeholders-section {
        margin-top: 28px;
      }
      .auto-messages-section {
        margin-top: 40px;
        padding-top: 32px;
        border-top: 1px solid var(--border);
      }
      .auto-messages-list {
        display: flex;
        flex-direction: column;
        gap: 20px;
        margin-bottom: 24px;
      }
      .auto-message-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 20px;
        box-shadow: var(--shadow);
      }
      .auto-message-card h3 { margin-top: 0; }
      .auto-message-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }
      .auto-title {
        flex: 1;
        font-size: 1.1rem;
        font-weight: 600;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 8px 10px;
      }
      .auto-message-card textarea,
      .auto-message-card input[type="text"],
      .auto-message-card input[type="time"],
      .auto-message-card input[type="datetime-local"] {
        width: 100%;
        margin-bottom: 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 8px 10px;
        font: inherit;
      }
      .schedule-fieldset {
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 16px;
        margin: 16px 0;
      }
      .schedule-fieldset legend {
        font-weight: 600;
        padding: 0 6px;
      }
      .schedule-options {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .schedule-option {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 4px 10px;
        align-items: center;
        cursor: pointer;
      }
      .schedule-option input[type="radio"] {
        grid-row: span 2;
        width: 16px;
        height: 16px;
      }
      .schedule-option span {
        font-weight: 600;
      }
      .schedule-option small {
        grid-column: 2;
        color: var(--text-muted);
        font-size: 0.85rem;
      }
      .schedule-once-input,
      .schedule-daily-input {
        grid-column: 2;
        max-width: 240px;
      }
      .schedule-badge {
        white-space: nowrap;
      }
      .enabled-field {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin: 8px 0 12px;
        font-weight: 600;
      }
      .auto-preview { margin-top: 8px; max-height: 120px; overflow: auto; }
      .auto-actions {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--border);
        flex-wrap: wrap;
      }
      .inline-form {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-right: 8px;
      }
      .auto-placeholders { margin-top: 24px; }
      .btn.danger { color: #b91c1c; border-color: #fecaca; }
    </style>
    ${alert}
    <section>
      <h2>Mensagem do bot</h2>
      <p class="meta">
        Edite o texto livremente. Use os placeholders — o bot substitui automaticamente na hora do envio.
        Placeholders desativados não aparecem na mensagem final.
      </p>

      <form method="post" action="/manager/template" class="template-form">
        <div class="editor-grid">
          <div class="editor-panel">
            <label for="template">Texto da mensagem</label>
            <div class="chip-row" id="placeholder-chips">${placeholderChips(data.placeholderVisibility)}</div>
            <textarea id="template" name="template" rows="14" spellcheck="false">${escapeHtml(data.template)}</textarea>
            <div class="form-actions">
              <button type="submit" class="btn primary">Salvar template</button>
              <button type="button" class="btn" id="reset-template">Restaurar padrão</button>
            </div>
          </div>

          <div class="preview-panel">
            <label>Preview (como vai no WhatsApp)</label>
            <pre id="preview" class="preview-box">${escapeHtml(data.previewText)}</pre>
            ${offerNote}
          </div>
        </div>

        <section class="placeholders-section">
          <h2>Placeholders disponíveis</h2>
          <p class="meta">Ative ou desative cada flag. Com a flag off, o placeholder some do texto enviado (linhas vazias são removidas).</p>
          <table>
            <thead><tr><th>Flag</th><th>Código</th><th>Significado</th><th>Exemplo</th></tr></thead>
            <tbody>${placeholderTable(data.placeholderVisibility)}</tbody>
          </table>
        </section>
      </form>
    </section>

    ${renderAutoMessagesSection(data)}

    <script>
      const textarea = document.getElementById('template');
      const preview = document.getElementById('preview');
      const chipRow = document.getElementById('placeholder-chips');
      const previewValues = ${JSON.stringify(data.previewValues)};
      const defaultTemplate = ${JSON.stringify(data.defaultTemplate)};
      const placeholderMeta = ${JSON.stringify(getPlaceholderHelp())};

      function getVisibility() {
        const visibility = {};
        document.querySelectorAll('.placeholder-toggle').forEach((input) => {
          const key = input.getAttribute('data-placeholder-key');
          visibility[key] = input.checked;
          const label = input.closest('.placeholder-flag')?.querySelector('span');
          if (label) label.textContent = input.checked ? 'Ativo' : 'Off';
        });
        return visibility;
      }

      function cleanupRenderedMessage(text) {
        return text
          .split('\\n')
          .filter((line) => /[A-Za-z0-9À-ÿ$]/.test(line))
          .join('\\n')
          .trim();
      }

      function renderPreview(text) {
        const visibility = getVisibility();
        let result = text;
        for (const [key, value] of Object.entries(previewValues)) {
          const pattern = new RegExp('\\\\{\\\\{\\\\s*' + key + '\\\\s*\\\\}\\\\}', 'g');
          result = result.replace(pattern, visibility[key] ? value : '');
        }
        result = cleanupRenderedMessage(result);
        preview.textContent = result || '(vazio)';
      }

      function renderChips() {
        const visibility = getVisibility();
        chipRow.innerHTML = placeholderMeta
          .filter((p) => visibility[p.key])
          .map(
            (p) =>
              '<button type="button" class="chip" data-placeholder="{{' +
              p.key +
              '}}" title="' +
              p.label +
              '">{{' +
              p.key +
              '}}</button>',
          )
          .join('');
        chipRow.querySelectorAll('.chip').forEach((btn) => {
          btn.addEventListener('click', () => insertPlaceholder(btn.getAttribute('data-placeholder')));
        });
      }

      function insertPlaceholder(token) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.slice(0, start) + token + textarea.value.slice(end);
        const pos = start + token.length;
        textarea.setSelectionRange(pos, pos);
        textarea.focus();
        renderPreview(textarea.value);
      }

      textarea.addEventListener('input', () => renderPreview(textarea.value));

      document.querySelectorAll('.placeholder-toggle').forEach((input) => {
        input.addEventListener('change', () => {
          renderChips();
          renderPreview(textarea.value);
        });
      });

      chipRow.querySelectorAll('.chip').forEach((btn) => {
        btn.addEventListener('click', () => insertPlaceholder(btn.getAttribute('data-placeholder')));
      });

      document.getElementById('reset-template').addEventListener('click', () => {
        radarConfirm({
          title: 'Restaurar padrão',
          message: 'Restaurar o texto padrão? Isso não salva até você clicar em Salvar.',
          confirmLabel: 'Restaurar',
        }).then((ok) => {
          if (!ok) return;
          textarea.value = defaultTemplate;
          renderPreview(textarea.value);
        });
      });

      function bindScheduleRadios() {
        document.querySelectorAll('[data-auto-message-card]').forEach((card) => {
          const radios = card.querySelectorAll('input[type="radio"][name="scheduleType"]');
          const onceInput = card.querySelector('.schedule-once-input');
          const dailyInput = card.querySelector('.schedule-daily-input');

          function sync() {
            const selected = card.querySelector('input[type="radio"][name="scheduleType"]:checked');
            const type = selected?.value ?? 'manual';
            if (onceInput) onceInput.disabled = type !== 'once';
            if (dailyInput) dailyInput.disabled = type !== 'daily';
          }

          radios.forEach((radio) => radio.addEventListener('change', sync));
          sync();
        });
      }

      document.querySelectorAll('[data-confirm-delete]').forEach((btn) => {
        btn.addEventListener('click', (event) => {
          event.preventDefault();
          const form = btn.closest('form');
          radarConfirm({
            title: 'Excluir mensagem',
            message: 'Excluir esta mensagem automática?',
            confirmLabel: 'Excluir',
          }).then((ok) => {
            if (ok && form) form.submit();
          });
        });
      });

      bindScheduleRadios();
    </script>`;

  return renderLayout('Mensagem', body, 'template');
}
