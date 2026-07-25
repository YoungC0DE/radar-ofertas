import type { AccountPlatform } from '../../src/accounts/types.js';
import { DEFAULT_ACCOUNT_ID } from '../../src/accounts/types.js';
import type { AccountCardData, AccountsPageData } from '../models/accounts-model.js';
import { isIntegrationConfigured, resolveIntegrationDisplayStatus } from '../models/accounts-model.js';
import { renderAccountConnectModals } from './accounts/connect-modals.js';
import { renderAccountConfigModals } from './accounts/modals.js';
import { renderAccountEnabledToggle } from './components/toggle.js';
import { ML_ICON, TELEGRAM_ICON, WA_ICON } from './components/icons.js';
import { escapeHtml } from './helpers.js';
import { renderLayoutShell } from './layout/shell.js';
import { pageData, pageScripts, pageStyles } from './page-assets.js';

function platformVisual(platform: AccountPlatform): { service: string; icon: string } {
  if (platform === 'whatsapp') return { service: 'wa', icon: WA_ICON };
  if (platform === 'telegram') return { service: 'telegram', icon: TELEGRAM_ICON };
  return { service: 'ml', icon: ML_ICON };
}

function integrationConfigDetail(card: AccountCardData): string {
  const { account } = card;
  if (account.platform === 'whatsapp' && card.whatsapp) {
    if (card.whatsapp.channelConfigured) {
      return `Canal: ${card.whatsapp.channelName ?? card.whatsapp.channelId}`;
    }
    return 'Canal não configurado';
  }
  if (account.platform === 'telegram' && card.telegram) {
    return card.telegram.chatId
      ? `Canal: ${card.telegram.chatId}`
      : 'Token/canal não configurados';
  }
  return '';
}

function marketplaceConfigDetail(card: AccountCardData): string {
  const parts: string[] = [];

  if (card.account.platform === 'mercado_livre' && card.mercadoLivre) {
    if (card.mercadoLivre.affiliateTag) {
      const tagLabel = card.mercadoLivre.affiliateTagFromEnv
        ? `Tag: ${card.mercadoLivre.affiliateTag} (.env)`
        : `Tag: ${card.mercadoLivre.affiliateTag}`;
      parts.push(tagLabel);
    } else {
      parts.push('Tag não configurada');
    }
  }

  parts.push(card.connection?.detail ?? 'Sem sessão de afiliado');
  return parts.join(' · ');
}

function integrationStatusBadge(card: AccountCardData): string {
  const status = resolveIntegrationDisplayStatus(card);
  return status === 'active'
    ? '<span class="account-name-status ok">Ativo</span>'
    : '<span class="account-name-status muted">Inativo</span>';
}

function marketplaceStatusBadge(card: AccountCardData): string {
  const active = card.account.enabled && (card.connection?.loggedIn ?? false);
  return active
    ? '<span class="account-name-status ok">Ativo</span>'
    : '<span class="account-name-status muted">Inativo</span>';
}

function renderLoginButton(
  accountId: string,
  platform: AccountPlatform,
  label = 'Logar',
): string {
  return `<button
    type="button"
    class="btn btn-sm primary account-login-btn"
    data-account-id="${escapeHtml(accountId)}"
    data-platform="${escapeHtml(platform)}"
  >${label}</button>`;
}

function renderIntegrationCard(card: AccountCardData): string {
  const { account } = card;
  const { service, icon } = platformVisual(account.platform);
  const isDefault = account.id === DEFAULT_ACCOUNT_ID;
  const configModalId =
    account.platform === 'whatsapp'
      ? `wa-config-modal-${account.id}`
      : account.platform === 'telegram'
        ? `tg-config-modal-${account.id}`
        : null;
  const disabledClass =
    resolveIntegrationDisplayStatus(card) === 'inactive' ? ' account-card-disabled' : '';
  const configDetail = integrationConfigDetail(card);
  const connectionDetail = card.connection?.detail ?? '';
  const toggleDisabled =
    !isIntegrationConfigured(card) || !(card.connection?.loggedIn ?? false);

  return `
    <article class="connect-card account-card account-card-integration${disabledClass}">
      <div class="connect-card-head">
        <span class="connect-icon connect-icon-${service}">${icon}</span>
        <div class="connect-card-text">
          <div class="connect-name-row">
            <div class="connect-name">${escapeHtml(account.label)}</div>
            ${integrationStatusBadge(card)}
          </div>
          ${configDetail ? `<div class="connect-detail meta">${escapeHtml(configDetail)}</div>` : ''}
          ${connectionDetail ? `<div class="connect-detail meta">${escapeHtml(connectionDetail)}</div>` : ''}
        </div>
      </div>
      <div class="account-footer account-footer-actions-only">
        <div class="op-actions account-card-actions">
          ${renderAccountEnabledToggle(account.id, account.platform, account.enabled, {
            disabled: toggleDisabled,
          })}
          ${
            configModalId
              ? `<button type="button" class="btn btn-sm account-config-btn" data-modal="${escapeHtml(configModalId)}">Configurar</button>`
              : ''
          }
          ${renderLoginButton(account.id, account.platform)}
          ${
            !isDefault
              ? `
          <form method="POST" action="/manager/accounts/${escapeHtml(account.id)}/${escapeHtml(account.platform)}/delete" class="inline-form"
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

function renderMarketplaceCard(card: AccountCardData): string {
  const { account } = card;
  const { service, icon } = platformVisual(account.platform);
  const isDefault = account.id === DEFAULT_ACCOUNT_ID;
  const loggedIn = card.connection?.loggedIn ?? false;
  const configModalId =
    account.platform === 'mercado_livre' ? `ml-config-modal-${account.id}` : null;
  const disabledClass =
    !account.enabled || !loggedIn ? ' account-card-disabled' : '';
  const toggleDisabled = !loggedIn;

  return `
    <article class="connect-card account-card account-card-marketplace${disabledClass}">
      <div class="connect-card-head">
        <span class="connect-icon connect-icon-${service}">${icon}</span>
        <div class="connect-card-text">
          <div class="connect-name-row">
            <div class="connect-name">${escapeHtml(account.label)}</div>
            ${marketplaceStatusBadge(card)}
          </div>
          <div class="connect-detail meta">${escapeHtml(marketplaceConfigDetail(card))}</div>
        </div>
      </div>
      <div class="account-footer account-footer-actions-only">
        <div class="op-actions account-card-actions">
          ${renderAccountEnabledToggle(account.id, account.platform, account.enabled, {
            disabled: toggleDisabled,
            title: loggedIn ? 'Habilitar coleta e links de afiliado' : 'Faça login antes de habilitar',
          })}
          ${
            configModalId
              ? `<button type="button" class="btn btn-sm account-config-btn" data-modal="${escapeHtml(configModalId)}">Configurar</button>`
              : ''
          }
          ${renderLoginButton(account.id, account.platform)}
          ${
            !isDefault
              ? `
          <form method="POST" action="/manager/accounts/${escapeHtml(account.id)}/${escapeHtml(account.platform)}/delete" class="inline-form"
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

function renderAccountCard(card: AccountCardData, variant: 'integration' | 'marketplace'): string {
  return variant === 'integration' ? renderIntegrationCard(card) : renderMarketplaceCard(card);
}

function renderAccountGrid(
  cards: AccountCardData[],
  emptyMessage: string,
  variant: 'integration' | 'marketplace',
): string {
  if (cards.length === 0) {
    return `
      <div class="accounts-empty">
        <p>${escapeHtml(emptyMessage)}</p>
      </div>`;
  }
  return cards.map((card) => renderAccountCard(card, variant)).join('');
}

function renderAddForm(
  action: string,
  platforms: AccountsPageData['integrationPlatforms'],
  labelPlaceholder: string,
): string {
  const platformOptions = platforms
    .map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.label)}</option>`)
    .join('');

  return `
    <form method="POST" action="${action}" class="accounts-add-form">
      <div class="accounts-form-grid">
        <div class="form-field">
          <label for="platform-${action}">Plataforma</label>
          <select name="platform" id="platform-${action}" class="modal-input" required>${platformOptions}</select>
        </div>
        <div class="form-field">
          <label for="label-${action}">Nome</label>
          <input type="text" name="label" id="label-${action}" class="modal-input" placeholder="${escapeHtml(labelPlaceholder)}" required>
        </div>
        <div class="form-field form-field-action">
          <button type="submit" class="btn primary">Adicionar</button>
        </div>
      </div>
    </form>`;
}

function renderSavedAlert(saved: string | null): string {
  if (saved === '1') return '<p class="alert ok">Alteração salva com sucesso.</p>';
  if (saved === 'deleted') return '<p class="alert ok">Conta removida.</p>';
  if (saved === 'config') return '<p class="alert ok">Configuração da conta salva com sucesso.</p>';
  if (saved && saved !== '1' && saved !== 'deleted' && saved !== 'config') {
    return `<p class="alert ok">${escapeHtml(saved)}</p>`;
  }
  return '';
}

export function renderAccountsPage(data: AccountsPageData): string {
  const alerts = [
    renderSavedAlert(data.saved),
    data.error ? `<p class="alert err">${escapeHtml(data.error)}</p>` : '',
  ]
    .filter(Boolean)
    .join('');

  const integrationCards = renderAccountGrid(
    data.integrations,
    'Nenhuma integração cadastrada.',
    'integration',
  );
  const marketplaceCards = renderAccountGrid(
    data.marketplaces,
    'Nenhum marketplace de afiliados cadastrado.',
    'marketplace',
  );

  const configModals = renderAccountConfigModals([...data.integrations, ...data.marketplaces]);

  const body = `
    ${alerts}

    <section class="accounts-group">
      <div class="accounts-section-head">
        <h2>Integrações</h2>
        <p class="meta">Canais de publicação — WhatsApp e Telegram. Use <strong>Logar</strong> para autenticar, <strong>Configurar</strong> para canal/token e o toggle para habilitar envios.</p>
      </div>
      <div class="connect-grid accounts-grid">${integrationCards}</div>
      ${renderAddForm('/manager/accounts/add', data.integrationPlatforms, 'Ex: WhatsApp Promoções')}
    </section>

    <section class="accounts-group">
      <div class="accounts-section-head">
        <h2>Marketplaces — Afiliados</h2>
        <p class="meta">Contas de sessão para coleta e links de afiliado. Use <strong>Configurar</strong> para a tag ML, <strong>Logar</strong> para salvar a sessão no portal.</p>
      </div>
      <div class="connect-grid accounts-grid">${marketplaceCards}</div>
      ${renderAddForm('/manager/accounts/add', data.marketplacePlatforms, 'Ex: Afiliado ML secundário')}
    </section>
  `;

  const afterMain = `
    ${configModals}
    ${renderAccountConnectModals()}
    ${pageData('accounts-page-data', {
      openConfigAccountId: data.openConfigAccountId,
      openConfigPlatform: data.openConfigPlatform,
      canSpawnWorkers: data.canSpawnWorkers,
      novncEnabled:
        process.env.MANAGER_VNC_ENABLED === 'true' || process.env.MANAGER_VNC_ENABLED === '1',
      novncPort: Number(process.env.MANAGER_NOVNC_PORT ?? 6080),
    })}
    ${pageScripts('shared/modal.js', 'accounts.js')}`;

  return renderLayoutShell(
    'Contas',
    body,
    'accounts',
    pageStyles('settings.css', 'accounts.css'),
    afterMain,
  );
}
