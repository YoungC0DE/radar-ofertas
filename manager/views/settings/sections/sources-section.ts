import type { SettingsData } from '../../../models/settings-model.js';
import { escapeHtml } from '../../helpers.js';
import { configRow, EDIT_ICON } from '../../components/index.js';

export function renderMlCouponsUrlSection(data: SettingsData): string {
  const value = `
    <div class="channel-inline">
      <code class="coupons-url-preview">${escapeHtml(data.mlCouponsUrl)}</code>
      <div class="channel-actions">
        <button type="button" class="btn btn-sm btn-icon" id="edit-coupons-url" title="Editar URL de cupons">${EDIT_ICON}</button>
      </div>
    </div>`;

  return configRow('URL de cupons ML', value, 'Página do hub de afiliados usada na busca de cupons');
}

export function renderSourcesPointer(data: SettingsData): string {
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
