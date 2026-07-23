import type { TemplatePageData } from '../models/template-model.js';
import {
  getAutoMessageDailyTimeValue,
  getAutoMessagePreview,
  getAutoMessageScheduleLabel,
  getAutoMessageScheduledInputValue,
  getCouponPlaceholderHelp,
  getPlaceholderHelp,
} from '../models/template-model.js';
import { escapeHtml, formatDate } from './helpers.js';
import { renderLayout } from './layout.js';
import { pageData, pageScripts, pageStyles } from './page-assets.js';
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

function couponPlaceholderChips(
  visibility: TemplatePageData['couponPlaceholderVisibility'],
): string {
  return getCouponPlaceholderHelp()
    .filter((p) => visibility[p.key])
    .map(
      (p) =>
        `<button type="button" class="chip" data-placeholder="{{${p.key}}}" title="${escapeHtml(p.label)}">{{${p.key}}}</button>`,
    )
    .join('\n');
}

function couponPlaceholderTable(
  visibility: TemplatePageData['couponPlaceholderVisibility'],
): string {
  return getCouponPlaceholderHelp()
    .map((p) => {
      const checked = visibility[p.key] ? ' checked' : '';
      return `<tr>
          <td>
            <label class="placeholder-flag">
              <input type="checkbox" name="coupon_placeholder_${p.key}" value="1" data-coupon-placeholder-key="${p.key}" class="coupon-placeholder-toggle"${checked}>
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
      </table>`;
}

function isAccordionOpen(section: 'offer' | 'coupon' | 'auto', data: TemplatePageData): boolean {
  if (data.savedSection === 'offer') return section === 'offer';
  if (data.savedSection === 'coupon') return section === 'coupon';
  if (data.autoMessageNotice) return section === 'auto';
  return section === 'offer';
}

function renderAccordionItem(
  title: string,
  description: string,
  content: string,
  open: boolean,
): string {
  return `<details class="template-accordion"${open ? ' open' : ''}>
      <summary class="template-accordion-summary">
        <span class="template-accordion-title">${escapeHtml(title)}</span>
        <span class="template-accordion-chevron" aria-hidden="true"></span>
      </summary>
      <div class="template-accordion-body">
        <p class="meta">${description}</p>
        ${content}
      </div>
    </details>`;
}

export function renderTemplatePage(data: TemplatePageData): string {
  const alert =
    data.savedSection === 'offer'
      ? '<p class="alert ok">Template de ofertas salvo com sucesso. Novas mensagens do bot usarão este texto.</p>'
      : data.savedSection === 'coupon'
        ? '<p class="alert ok">Template de cupom salvo com sucesso. O envio em Cupons usará este texto.</p>'
        : data.autoMessageNotice
          ? `<p class="alert ok">${escapeHtml(data.autoMessageNotice)}</p>`
          : data.error
            ? `<p class="alert err">${escapeHtml(data.error)}</p>`
            : '';

  const offerNote = data.previewOffer
    ? `<p class="meta">Preview com a oferta mais recente: <strong>${escapeHtml(data.previewOffer.title.slice(0, 50))}${data.previewOffer.title.length > 50 ? '…' : ''}</strong></p>`
    : '<p class="meta">Nenhuma oferta salva ainda — preview usa dados de exemplo.</p>';

  const offerSection = `
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
          <h3>Placeholders disponíveis</h3>
          <p class="meta">Ative ou desative cada flag. Com a flag off, o placeholder some do texto enviado (linhas vazias são removidas).</p>
          <table>
            <thead><tr><th>Flag</th><th>Código</th><th>Significado</th><th>Exemplo</th></tr></thead>
            <tbody>${placeholderTable(data.placeholderVisibility)}</tbody>
          </table>
        </section>
      </form>`;

  const couponSection = `
      <form method="post" action="/manager/template/coupon" class="template-form">
        <div class="editor-grid">
          <div class="editor-panel">
            <label for="coupon-template">Texto da mensagem</label>
            <div class="chip-row" id="coupon-placeholder-chips">${couponPlaceholderChips(data.couponPlaceholderVisibility)}</div>
            <textarea id="coupon-template" name="couponTemplate" rows="12" spellcheck="false">${escapeHtml(data.couponTemplate)}</textarea>
            <div class="form-actions">
              <button type="submit" class="btn primary">Salvar template de cupom</button>
              <button type="button" class="btn" id="reset-coupon-template">Restaurar padrão</button>
            </div>
          </div>

          <div class="preview-panel">
            <label>Preview (como vai no canal)</label>
            <pre id="coupon-preview" class="preview-box">${escapeHtml(data.couponPreviewText)}</pre>
            <p class="meta">Preview com dados de exemplo de cupom disponível.</p>
          </div>
        </div>

        <section class="placeholders-section">
          <h3>Placeholders do cupom</h3>
          <p class="meta">Ative ou desative cada flag. Com a flag off, o placeholder some do texto enviado.</p>
          <table>
            <thead><tr><th>Flag</th><th>Código</th><th>Significado</th><th>Exemplo</th></tr></thead>
            <tbody>${couponPlaceholderTable(data.couponPlaceholderVisibility)}</tbody>
          </table>
        </section>
      </form>`;

  const body = `
    ${alert}
    <div class="template-accordions">
      ${renderAccordionItem(
        'Mensagem de ofertas',
        'Edite o texto livremente. Use os placeholders — o bot substitui automaticamente na hora do envio. Placeholders desativados não aparecem na mensagem final.',
        offerSection,
        isAccordionOpen('offer', data),
      )}
      ${renderAccordionItem(
        'Mensagem de cupom',
        'Texto usado ao clicar em <strong>Enviar ao canal</strong> na página de Cupons. Use os placeholders — o bot substitui automaticamente na hora do envio.',
        couponSection,
        isAccordionOpen('coupon', data),
      )}
      ${renderAccordionItem(
        'Mensagens automáticas',
        'Crie textos como bom dia, código promocional ou avisos. Salve a mensagem, escolha o horário de envio e clique em <strong>Salvar e programar</strong> — o bot envia automaticamente no horário definido.',
        renderAutoMessagesSection(data),
        isAccordionOpen('auto', data),
      )}
    </div>

    ${pageData('template-page-data', {
      previewValues: data.previewValues,
      defaultTemplate: data.defaultTemplate,
      placeholderMeta: getPlaceholderHelp(),
      couponPreviewValues: data.couponPreviewValues,
      couponPlaceholderMeta: getCouponPlaceholderHelp(),
      couponDefaultTemplate: data.defaultCouponTemplate,
    })}
    ${pageScripts('template.js')}`;

  return renderLayout('Mensagem', body, 'template', pageStyles('template.css'));
}
