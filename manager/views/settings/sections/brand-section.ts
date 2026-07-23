import type { SettingsData } from '../../../models/settings-model.js';
import { escapeHtml } from '../../helpers.js';
import { configRow, EDIT_ICON } from '../../components/index.js';

export function renderBrandSection(data: SettingsData): string {
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

  return configRow(
    'Identidade visual',
    brandValue,
    'Nome e ícone exibidos na barra lateral do painel',
  );
}

export function renderBrandRemoveLogoField(data: SettingsData): string {
  if (!data.brandLogoHref) return '';
  return `<label class="modal-checkbox">
    <input type="checkbox" name="removeLogo" value="1" id="modal-remove-logo">
    Remover imagem atual
  </label>`;
}
