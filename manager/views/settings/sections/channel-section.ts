import type { SettingsData } from '../../../models/settings-model.js';
import { escapeHtml } from '../../helpers.js';
import { configRow, EDIT_ICON } from '../../components/index.js';

export function renderChannelSection(data: SettingsData): string {
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
