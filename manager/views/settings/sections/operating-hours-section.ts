import type { SettingsData } from '../../../models/settings-model.js';
import { escapeHtml } from '../../helpers.js';
import { configRow, EDIT_ICON } from '../../components/index.js';

export function endHourForForm(end: number): number {
  return end === 0 ? 24 : end;
}

export function renderHourInput(name: string, id: string, value: number, kind: 'start' | 'end'): string {
  const min = kind === 'start' ? 0 : 1;
  const max = kind === 'start' ? 23 : 24;

  return `<div class="hour-input-wrap">
    <input type="number" id="${id}" name="${name}" value="${value}" min="${min}" max="${max}" step="1" required class="modal-input hour-input">
    <span class="hour-input-suffix">:00</span>
  </div>`;
}

export function renderOperatingHoursSection(data: SettingsData, statusBadge: string): string {
  const value = `
    <div class="channel-inline">
      <span class="channel-name">${escapeHtml(data.operatingHoursLabel)} ${statusBadge}</span>
      <div class="channel-actions">
        <button type="button" class="btn btn-sm btn-icon" id="edit-operating-hours" title="Editar janela operacional">${EDIT_ICON}</button>
      </div>
    </div>`;

  return configRow('Janela operacional', value, 'Horário em que o bot coleta e envia ofertas');
}
