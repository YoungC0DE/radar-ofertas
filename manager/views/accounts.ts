import type { AccountsPageData } from '../models/accounts-model.js';
import { escapeHtml } from './helpers.js';
import { renderLayoutShell } from './layout/shell.js';
import { pageStyles } from './page-assets.js';

function renderAccountCard(account: AccountsPageData['accounts'][number]): string {
  const statusBadge = account.enabled
    ? '<span class="badge badge-success">Ativo</span>'
    : '<span class="badge badge-warn">Desabilitado</span>';

  const platformLabel =
    account.platform === 'whatsapp' ? 'WhatsApp' :
    account.platform === 'telegram' ? 'Telegram' :
    'Mercado Livre';

  let configInfo = '';
  if (account.platform === 'whatsapp') {
    configInfo = `<div class="config-detail">Canal: <code>${escapeHtml(account.config.channelId || '(não configurado)')}</code></div>`;
  } else if (account.platform === 'telegram') {
    configInfo = `<div class="config-detail">Chat: <code>${escapeHtml(account.config.chatId || '(não configurado)')}</code></div>`;
  }

  const isDefault = account.id === 'default';

  return `
    <div class="card account-card">
      <div class="card-header">
        <div>
          <strong>${escapeHtml(account.label)}</strong>
          <span class="badge badge-muted">${escapeHtml(platformLabel)}</span>
          ${statusBadge}
          ${isDefault ? '<span class="badge">Padrão</span>' : ''}
        </div>
        <div class="card-actions">
          <form method="POST" action="/manager/accounts/${escapeHtml(account.id)}/toggle" style="display:inline">
            <button type="submit" class="btn btn-sm">${account.enabled ? 'Desabilitar' : 'Habilitar'}</button>
          </form>
          ${!isDefault ? `
          <form method="POST" action="/manager/accounts/${escapeHtml(account.id)}/delete" style="display:inline"
                onsubmit="return confirm('Remover a conta ${escapeHtml(account.label)}?')">
            <button type="submit" class="btn btn-sm btn-danger">Remover</button>
          </form>` : ''}
        </div>
      </div>
      <div class="card-body">
        ${configInfo}
        <div class="config-detail">ID: <code>${escapeHtml(account.id)}</code></div>
      </div>
    </div>
  `;
}

export function renderAccountsPage(data: AccountsPageData): string {
  const { accounts, platforms, saved, error } = data;

  const alerts = [
    saved ? `<div class="alert alert-success">${escapeHtml(saved)}</div>` : '',
    error ? `<div class="alert alert-error">${escapeHtml(error)}</div>` : '',
  ].filter(Boolean).join('');

  const accountCards = accounts.map(renderAccountCard).join('');

  const platformOptions = platforms
    .map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.label)}</option>`)
    .join('');

  const body = `
    ${alerts}

    <section class="section">
      <h2>Contas cadastradas</h2>
      ${accountCards || '<p class="empty-state">Nenhuma conta cadastrada.</p>'}
    </section>

    <section class="section">
      <h2>Adicionar conta</h2>
      <form method="POST" action="/manager/accounts/add" class="form-inline">
        <div class="form-group">
          <label for="platform">Plataforma</label>
          <select name="platform" id="platform" class="form-control">${platformOptions}</select>
        </div>
        <div class="form-group">
          <label for="label">Nome</label>
          <input type="text" name="label" id="label" class="form-control" placeholder="Ex: WhatsApp Promoções" required>
        </div>
        <button type="submit" class="btn primary">Adicionar</button>
      </form>
    </section>
  `;

  return renderLayoutShell(
    'Contas',
    body,
    'accounts',
    pageStyles('settings.css'),
  );
}
