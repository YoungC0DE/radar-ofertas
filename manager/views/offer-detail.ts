import type { OfferRecord } from '../../src/offers/types.js';
import { env } from '../../src/config/env.js';
import { escapeHtml, formatCurrency, formatDate, statusBadge } from './helpers.js';
import { renderLayout } from './layout.js';

export function renderOfferDetail(offer: OfferRecord, messagePreview: string): string {
  const body = `
    <section>
      <p><a class="link" href="/manager/offers">← Voltar</a></p>
      <h2>${escapeHtml(offer.title)}</h2>
      <dl>
        <dt>ID</dt><dd><code>${escapeHtml(offer.id)}</code></dd>
        <dt>ML ID</dt><dd>${escapeHtml(offer.mercadoLivreId)}</dd>
        <dt>Score</dt><dd>${offer.score}</dd>
        <dt>Preço</dt><dd>${formatCurrency(offer.price)}</dd>
        <dt>Preço anterior</dt><dd>${offer.oldPrice != null ? formatCurrency(offer.oldPrice) : '—'}</dd>
        <dt>Desconto</dt><dd>${offer.discount != null ? `${offer.discount}%` : '—'}</dd>
        <dt>Avaliação</dt><dd>${offer.rating != null ? offer.rating.toFixed(1) : '—'}</dd>
        <dt>Vendidos</dt><dd>${offer.soldQuantity ?? '—'}</dd>
        <dt>Ranking</dt><dd>${offer.salesRank ? escapeHtml(offer.salesRank) : '—'}</dd>
        <dt>Vendedor</dt><dd>${offer.seller ? escapeHtml(offer.seller) : '—'}${offer.officialStore ? ' ✅ Loja oficial' : ''}</dd>
        <dt>Mais vendido</dt><dd>${offer.bestSeller ? '🏆 Sim' : '—'}</dd>
        <dt>Status</dt><dd>${statusBadge(offer.sentAt)}</dd>
        <dt>Salva em</dt><dd>${formatDate(offer.createdAt, env.APP_TIMEZONE)}</dd>
        <dt>Enviada em</dt><dd>${formatDate(offer.sentAt, env.APP_TIMEZONE)}</dd>
        <dt>Link afiliado</dt><dd>${offer.affiliateLink ? `<a class="link" href="${escapeHtml(offer.affiliateLink)}" target="_blank" rel="noopener">${escapeHtml(offer.affiliateLink)}</a>` : '—'}</dd>
        <dt>Imagem</dt><dd>${offer.image ? `<a class="link" href="${escapeHtml(offer.image)}" target="_blank" rel="noopener">Abrir</a>` : '—'}</dd>
      </dl>
    </section>

    <section>
      <h2>Mensagem que o bot enviará</h2>
      <p class="meta"><a class="link" href="/manager/template">Editar template →</a></p>
      <pre class="message-preview">${escapeHtml(messagePreview)}</pre>
    </section>`;

  return renderLayout('Detalhe', body, 'offers');
}

export function renderNotFound(message: string): string {
  const body = `<section><h2>Não encontrado</h2><p>${escapeHtml(message)}</p><p><a class="link" href="/manager">Dashboard</a></p></section>`;
  return renderLayout('404', body);
}
