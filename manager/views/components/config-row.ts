import { escapeHtml } from '../helpers.js';

export function configRow(label: string, value: string, hint?: string): string {
  return `<div class="config-row">
    <div class="config-label">${escapeHtml(label)}</div>
    <div class="config-value">${value}</div>
    ${hint ? `<div class="config-hint">${hint}</div>` : ''}
  </div>`;
}

export function renderEditableValue(
  label: string,
  display: string,
  editButtonId: string,
  editIcon: string,
): string {
  return `<div class="channel-inline">
    <span class="channel-name">${escapeHtml(display)}</span>
    <div class="channel-actions">
      <button type="button" class="btn btn-sm btn-icon" id="${editButtonId}" title="Editar ${escapeHtml(label)}">${editIcon}</button>
    </div>
  </div>`;
}
