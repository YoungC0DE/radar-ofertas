import type { SettingsSaveType } from '../../models/settings-model.js';
import { escapeHtml } from '../helpers.js';

const SAVED_MESSAGES: Partial<Record<NonNullable<SettingsSaveType>, string>> = {
  channel: 'Link do canal salvo com sucesso.',
  interval: 'Intervalo de envio atualizado com sucesso.',
  brand: 'Identidade visual atualizada com sucesso.',
  score: 'Regras de pontuação atualizadas com sucesso.',
  hours: 'Janela operacional atualizada com sucesso.',
  senderDelay: 'Tempo entre envios atualizado com sucesso.',
  mlSources: 'Fontes ML atualizadas com sucesso.',
  couponsUrl: 'URL de cupons atualizada com sucesso.',
};

export function renderSettingsAlert(saved: SettingsSaveType, error: string | null): string {
  if (saved && SAVED_MESSAGES[saved]) {
    return `<p class="alert ok">${SAVED_MESSAGES[saved]}</p>`;
  }
  if (error) {
    return `<p class="alert err">${escapeHtml(error)}</p>`;
  }
  return '';
}
