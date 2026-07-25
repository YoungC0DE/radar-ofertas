import { escapeHtml } from '../helpers.js';

export function renderAccountEnabledToggle(
  accountId: string,
  platform: string,
  enabled: boolean,
  options: { disabled?: boolean; title?: string } = {},
): string {
  const disabledAttr = options.disabled ? ' disabled' : '';
  const title = options.title ?? 'Habilitar envio nesta conta';
  const checked = enabled ? ' checked' : '';

  return `
    <form method="POST" action="/manager/accounts/${escapeHtml(accountId)}/${escapeHtml(platform)}/toggle" class="account-enabled-form inline-form">
      <label class="account-enabled-toggle" title="${escapeHtml(title)}">
        <input
          type="checkbox"
          class="account-enabled-input"
          aria-label="${escapeHtml(title)}"
          ${checked}${disabledAttr}
        >
        <span class="account-enabled-slider" aria-hidden="true"></span>
      </label>
    </form>`;
}
