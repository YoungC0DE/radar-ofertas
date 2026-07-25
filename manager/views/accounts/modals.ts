import type { AccountCardData } from '../../models/accounts-model.js';
import type { WhatsAppDestinationView } from '../../models/whatsapp-destinations-model.js';
import { escapeHtml } from '../helpers.js';

function renderDestinationItem(
  accountId: string,
  destination: WhatsAppDestinationView,
): string {
  const name = destination.label?.trim() || 'Sem nome';

  return `
    <li class="destination-item" data-destination-id="${escapeHtml(destination.id)}">
      <div class="destination-main">
        <strong>${escapeHtml(name)}</strong>
        <span class="meta">${escapeHtml(destination.kindLabel)}</span>
        ${
          destination.enabled
            ? '<span class="badge ok">Ativo</span>'
            : '<span class="badge warn">Pausado</span>'
        }
      </div>
      <div class="destination-meta">
        <code>${escapeHtml(destination.jid)}</code>
      </div>
      <div class="destination-actions">
        <button
          type="button"
          class="btn btn-sm destination-toggle"
          data-account-id="${escapeHtml(accountId)}"
          data-destination-id="${escapeHtml(destination.id)}"
          data-enabled="${destination.enabled ? '0' : '1'}"
        >${destination.enabled ? 'Pausar' : 'Ativar'}</button>
        <button
          type="button"
          class="btn btn-sm btn-danger destination-remove"
          data-account-id="${escapeHtml(accountId)}"
          data-destination-id="${escapeHtml(destination.id)}"
        >Remover</button>
      </div>
    </li>`;
}

export function renderWhatsAppConfigModal(card: AccountCardData): string {
  const account = card.account;
  if (account.platform !== 'whatsapp' || !card.whatsapp) return '';

  const { whatsapp } = card;
  const modalId = `wa-config-modal-${account.id}`;

  const configuredStatus = whatsapp.channelConfigured
    ? `<p class="meta integration-status ok">
        Canal configurado: <strong>${escapeHtml(whatsapp.channelName ?? 'Canal WhatsApp')}</strong>
        <code>${escapeHtml(whatsapp.channelId)}</code>
      </p>`
    : '<p class="meta integration-status warn">Nenhum canal configurado ainda.</p>';

  const destinationsList =
    whatsapp.destinations.length > 0
      ? `<ul class="destinations-list">${whatsapp.destinations.map((destination) => renderDestinationItem(account.id, destination)).join('')}</ul>`
      : '<p class="meta">Nenhum destino extra — adicione grupos ou canais abaixo.</p>';

  return `
    <div id="${modalId}" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="${modalId}-title">
        <div class="modal-header">
          <h3 id="${modalId}-title">Configurar WhatsApp — ${escapeHtml(account.label)}</h3>
        </div>
        <div class="modal-body">
          ${configuredStatus}
          <form method="post" action="/manager/accounts/${escapeHtml(account.id)}/whatsapp-channel" class="integration-form">
            <label for="${modalId}-invite" class="modal-label">Link de compartilhamento do canal</label>
            <input
              type="text"
              id="${modalId}-invite"
              name="inviteLink"
              value="${escapeHtml(whatsapp.channelInviteLink)}"
              placeholder="https://whatsapp.com/channel/AbCdEfGhIjKlMn"
              spellcheck="false"
              class="modal-input"
              required
            >
            <p class="modal-help">Use <strong>Logar</strong> na tela de Contas para autenticar o WhatsApp antes de salvar. O sistema descobre o ID do canal automaticamente.</p>
            <button type="submit" class="btn btn-sm primary">Salvar canal principal</button>
          </form>

          <div class="account-config-divider"></div>

          <h4 class="account-config-subtitle">Destinos adicionais</h4>
          ${destinationsList}
          <form method="post" action="/manager/accounts/${escapeHtml(account.id)}/whatsapp-destinations/add" class="integration-form">
            <label for="${modalId}-destination" class="modal-label">Adicionar destino (grupo ou canal)</label>
            <input
              type="text"
              id="${modalId}-destination"
              name="inviteInput"
              value=""
              placeholder="https://chat.whatsapp.com/... ou https://whatsapp.com/channel/..."
              spellcheck="false"
              class="modal-input"
            >
            <button type="submit" class="btn btn-sm">Adicionar destino</button>
          </form>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn modal-cancel" data-modal="${modalId}">Fechar</button>
        </div>
      </div>
    </div>`;
}

export function renderMercadoLivreConfigModal(card: AccountCardData): string {
  const account = card.account;
  if (account.platform !== 'mercado_livre' || !card.mercadoLivre) return '';

  const { mercadoLivre } = card;
  const modalId = `ml-config-modal-${account.id}`;
  const storedTag = account.config.affiliateTag?.trim() ?? '';

  return `
    <div id="${modalId}" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="${modalId}-title">
        <div class="modal-header">
          <h3 id="${modalId}-title">Configurar Mercado Livre — ${escapeHtml(account.label)}</h3>
        </div>
        <form method="post" action="/manager/accounts/${escapeHtml(account.id)}/mercado-livre">
          <div class="modal-body">
            <label for="${modalId}-tag" class="modal-label">Tag de afiliado</label>
            <input
              type="text"
              id="${modalId}-tag"
              name="affiliateTag"
              value="${escapeHtml(storedTag)}"
              placeholder="seu-tag-ml"
              spellcheck="false"
              autocomplete="off"
              class="modal-input"
            >
            <p class="modal-help">
              Tag do programa de afiliados do Mercado Livre, usada na geração de links.
              ${
                mercadoLivre.affiliateTagFromEnv && mercadoLivre.affiliateTag
                  ? `Atualmente herdando do <code>AFFILIATE_CONFIG</code>: <strong>${escapeHtml(mercadoLivre.affiliateTag)}</strong>.`
                  : 'Deixe vazio para usar o valor de <code>AFFILIATE_CONFIG</code> no <code>.env</code>.'
              }
            </p>
            <p class="modal-help">
              Sessão: ${escapeHtml(mercadoLivre.sessionDetail)} — use <strong>Logar</strong> na tela de Contas para renovar.
            </p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn modal-cancel" data-modal="${modalId}">Cancelar</button>
            <button type="submit" class="btn primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>`;
}

export function renderTelegramConfigModal(card: AccountCardData): string {
  const account = card.account;
  if (account.platform !== 'telegram' || !card.telegram) return '';

  const { telegram } = card;
  const modalId = `tg-config-modal-${account.id}`;
  const tokenPlaceholder = telegram.hasBotToken
    ? 'Token já configurado — deixe em branco para manter'
    : '123456789:ABCdefGHI...';

  return `
    <div id="${modalId}" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="${modalId}-title">
        <div class="modal-header">
          <h3 id="${modalId}-title">Configurar Telegram — ${escapeHtml(account.label)}</h3>
        </div>
        <form method="post" action="/manager/accounts/${escapeHtml(account.id)}/telegram">
          <div class="modal-body">
            <label class="checkbox-row">
              <input type="checkbox" name="telegramEnabled" value="1"${account.enabled ? ' checked' : ''}>
              Ativar publicação no Telegram
            </label>
            <label for="${modalId}-token" class="modal-label">Token do bot (@BotFather)</label>
            <input
              type="password"
              id="${modalId}-token"
              name="botToken"
              value=""
              placeholder="${escapeHtml(tokenPlaceholder)}"
              autocomplete="off"
              class="modal-input"
            >
            <label for="${modalId}-chat" class="modal-label">Canal de destino</label>
            <input
              type="text"
              id="${modalId}-chat"
              name="chatId"
              value="${escapeHtml(telegram.chatId)}"
              placeholder="@meucanal ou -1001234567890"
              spellcheck="false"
              class="modal-input"
            >
            <p class="modal-help">Crie o bot no @BotFather, adicione-o como <strong>administrador</strong> do canal com permissão de publicar.</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn modal-cancel" data-modal="${modalId}">Cancelar</button>
            <button type="submit" class="btn primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>`;
}

export function renderAccountConfigModals(cards: AccountCardData[]): string {
  return cards
    .map((card) => {
      if (card.account.platform === 'whatsapp') return renderWhatsAppConfigModal(card);
      if (card.account.platform === 'telegram') return renderTelegramConfigModal(card);
      if (card.account.platform === 'mercado_livre') return renderMercadoLivreConfigModal(card);
      return '';
    })
    .join('');
}
