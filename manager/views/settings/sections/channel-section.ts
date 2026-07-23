import type { SettingsData } from '../../../models/settings-model.js';
import { escapeHtml } from '../../helpers.js';
import { configRow } from '../../components/index.js';

function renderDestinationItem(destination: SettingsData['whatsappDestinations'][number]): string {
  const name = destination.label?.trim() || 'Sem nome';
  const status = destination.enabled
    ? '<span class="badge ok">Ativo</span>'
    : '<span class="badge warn">Pausado</span>';

  return `
    <li class="destination-item" data-destination-id="${escapeHtml(destination.id)}">
      <div class="destination-main">
        <strong>${escapeHtml(name)}</strong>
        <span class="meta">${escapeHtml(destination.kindLabel)}</span>
        ${status}
      </div>
      <div class="destination-meta">
        <code>${escapeHtml(destination.jid)}</code>
      </div>
      <div class="destination-actions">
        <button
          type="button"
          class="btn btn-sm destination-toggle"
          data-destination-id="${escapeHtml(destination.id)}"
          data-enabled="${destination.enabled ? '0' : '1'}"
        >${destination.enabled ? 'Pausar' : 'Ativar'}</button>
        <button
          type="button"
          class="btn btn-sm btn-danger destination-remove"
          data-destination-id="${escapeHtml(destination.id)}"
        >Remover</button>
      </div>
    </li>`;
}

export function renderChannelSection(data: SettingsData): string {
  const destinations = data.whatsappDestinations;
  const list =
    destinations.length > 0
      ? `<ul class="destinations-list">${destinations.map(renderDestinationItem).join('')}</ul>`
      : '<p class="meta">Nenhum destino configurado — adicione um canal ou grupo abaixo.</p>';

  const channelValue = `
    <div class="destinations-wrap">
      ${list}
      <button type="button" class="btn btn-sm" id="add-whatsapp-destination">Adicionar destino</button>
    </div>`;

  return configRow('Destinos WhatsApp', channelValue);
}
