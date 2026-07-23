import type { Account, AccountPlatform } from '../../src/accounts/types.js';
import { accountPlatformLabel } from '../../src/accounts/types.js';
import type { AccountsPageData } from '../models/accounts-model.js';
import { ML_ICON, TELEGRAM_ICON, WA_ICON } from './components/icons.js';
import { escapeHtml } from './helpers.js';
import { renderLayoutShell } from './layout/shell.js';
import { pageStyles } from './page-assets.js';

function platformVisual(platform: AccountPlatform): { service: string; icon: string } {
  if (platform === 'whatsapp') return { service: 'wa', icon: WA_ICON };
  if (platform === 'telegram') return { service: 'telegram', icon: TELEGRAM_ICON };
  return { service: 'ml', icon: ML_ICON };
}

function accountConfigDetail(account: Account): string {
  if (account.platform === 'whatsapp') {
    return `Canal: ${account.config.channelId || '(não configurado)'}`;
  }
  if (account.platform === 'telegram') {
    return `Chat: ${account.config.chatId || '(não configurado)'}`;
  }
  return 'Sessão de afiliado';
}

function renderAccountCard(account: Account): string {
  const { service, icon } = platformVisual(account.platform);
  const isDefault = account.id === 'default';
  const platformLabel = accountPlatformLabel(account.platform);

  const statusBadge = account.enabled
    ? '<span class="badge ok">Ativo</span>'
    : '<span class="badge warn">Desabilitado</span>';

  const defaultBadge = isDefault ? '<span class="badge">Padrão</span>' : '';
  const disabledClass = account.enabled ? '' : ' account-card-disabled';
  const toggleLabel = account.enabled ? 'Desabilitar' : 'Habilitar';

  return `
    <article class="connect-card account-card${disabledClass}">
      <div class="connect-card-head">
        <span class="connect-icon connect-icon-${service}">${icon}</span>
        <div class="connect-card-text">
          <div class="connect-name">${escapeHtml(account.label)}</div>
          <div class="connect-detail meta">${escapeHtml(accountConfigDetail(account))}</div>
          <div class="account-badges">
            <span class="badge">${escapeHtml(platformLabel)}</span>
            ${statusBadge}
            ${defaultBadge}
          </div>
        </div>
      </div>
      <div class="account-footer">
        <span class="account-id meta">ID: <code>${escapeHtml(account.id)}</code></span>
        <div class="op-actions">
          <form method="POST" action="/manager/accounts/${escapeHtml(account.id)}/toggle" class="inline-form">
            <button type="submit" class="btn btn-sm${account.enabled ? '' : ' primary'}">${toggleLabel}</button>
          </form>
          ${
            !isDefault
              ? `
          <form method="POST" action="/manager/accounts/${escapeHtml(account.id)}/delete" class="inline-form"
                onsubmit="return confirm('Remover a conta ${escapeHtml(account.label)}?')">
            <button type="submit" class="btn btn-sm btn-danger">Remover</button>
          </form>`
              : ''
          }
        </div>
      </div>
    </article>
  `;
}

export function renderAccountsPage(data: AccountsPageData): string {
  const { accounts, platforms, saved, error } = data;

  const alerts = [
    saved ? `<p class="alert ok">${escapeHtml(saved)}</p>` : '',
    error ? `<p class="alert err">${escapeHtml(error)}</p>` : '',
  ]
    .filter(Boolean)
    .join('');

  const accountCards = accounts.map(renderAccountCard).join('');

  const platformOptions = platforms
    .map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.label)}</option>`)
    .join('');

  const emptyState = `
    <div class="accounts-empty">
      <p>Nenhuma conta cadastrada.</p>
      <p class="meta">Adicione uma conta abaixo para começar.</p>
    </div>`;

  const body = `
    ${alerts}

    <section>
      <div class="accounts-section-head">
        <h2>Contas cadastradas</h2>
        <p class="meta">Gerencie as contas de WhatsApp, Telegram e Mercado Livre usadas pelo bot.</p>
      </div>
      <div class="connect-grid accounts-grid">
        ${accountCards || emptyState}
      </div>
    </section>

    <section>
      <h2>Adicionar conta</h2>
      <p class="meta">Crie uma nova conta para publicar ou coletar ofertas em outro canal.</p>
      <form method="POST" action="/manager/accounts/add" class="accounts-add-form">
        <div class="accounts-form-grid">
          <div class="form-field">
            <label for="platform">Plataforma</label>
            <select name="platform" id="platform" class="modal-input">${platformOptions}</select>
          </div>
          <div class="form-field">
            <label for="label">Nome</label>
            <input type="text" name="label" id="label" class="modal-input" placeholder="Ex: WhatsApp Promoções" required>
          </div>
          <div class="form-field form-field-action">
            <button type="submit" class="btn primary">Adicionar</button>
          </div>
        </div>
      </form>
    </section>
  `;

  return renderLayoutShell('Contas', body, 'accounts', pageStyles('settings.css', 'accounts.css'));
}
