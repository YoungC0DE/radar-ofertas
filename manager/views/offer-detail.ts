import type { OfferRecord } from '../../src/offers/types.js';
import {
  detectOfferPlatform,
  offerPlatformLabel,
  offerProductIdLabel,
} from '../../src/offers/platform.js';
import {
  formatOfferRating,
  formatSoldQuantity,
  parseAmazonReviewsCount,
} from '../../src/offers/message-template.js';
import { env } from '../../src/config/env.js';
import { escapeHtml, formatCurrency, formatDate, statusBadge } from './helpers.js';
import { renderPlatformBadge } from './offer-cells.js';
import { renderLayout } from './layout.js';
import { pageScripts, pageStyles } from './page-assets.js';

function configRow(label: string, value: string, hint?: string): string {
  return `<div class="config-row">
    <div class="config-label">${escapeHtml(label)}</div>
    <div class="config-value">${value}</div>
    ${hint ? `<div class="config-hint">${escapeHtml(hint)}</div>` : ''}
  </div>`;
}

function renderAffiliateLinkCell(affiliateLink: string | null): string {
  if (!affiliateLink) return '<span class="meta">—</span>';

  return `<div class="affiliate-link-row">
    <a class="link" href="${escapeHtml(affiliateLink)}" target="_blank" rel="noopener">${escapeHtml(affiliateLink)}</a>
    <button type="button" class="btn btn-sm" id="copy-affiliate-link" data-url="${escapeHtml(affiliateLink)}">Copiar</button>
    <span id="copy-affiliate-feedback" class="copy-feedback hidden" aria-live="polite">Copiado!</span>
  </div>`;
}

function renderPermalinkCell(permalink: string | null): string {
  if (!permalink) return '<span class="meta">—</span>';
  return `<a class="link" href="${escapeHtml(permalink)}" target="_blank" rel="noopener">Abrir produto</a>`;
}

export function renderOfferDetail(
  offer: OfferRecord,
  messagePreview: string,
  coupon: string | null = null,
): string {
  const platform = detectOfferPlatform(offer);
  const platformLabel = offerPlatformLabel(platform);
  const productIdLabel = offerProductIdLabel(platform);
  const isAmazon = platform === 'amazon';
  const reviewsCount = isAmazon ? parseAmazonReviewsCount(offer.salesRank) : null;
  const ratingLabel = formatOfferRating(offer.rating, platform, reviewsCount);
  const soldLabel = formatSoldQuantity(offer.soldQuantity, platform);
  const isPending = !offer.sentAt;

  const headerActions = isPending
    ? `<form method="post" action="/manager/offers/${escapeHtml(offer.id)}/send-now" class="inline-form">
        <button type="submit" class="btn btn-sm primary">Enviar agora</button>
      </form>
      <form method="post" action="/manager/offers/${escapeHtml(offer.id)}/delete" class="offer-delete-form">
        <button type="button" class="btn-trash offer-delete-btn" title="Apagar oferta pendente" aria-label="Apagar oferta">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </form>`
    : '';

  const rows = [
    configRow('Origem', `${renderPlatformBadge(offer)} <span class="meta">${escapeHtml(platformLabel)}</span>`),
    configRow('ID interno', `<code>${escapeHtml(offer.id)}</code>`),
    configRow(productIdLabel, `<code>${escapeHtml(offer.mercadoLivreId)}</code>`),
    configRow('Score', String(offer.score)),
    configRow('Preço', formatCurrency(offer.price)),
    configRow('Preço anterior', offer.oldPrice != null ? formatCurrency(offer.oldPrice) : '—'),
    configRow('Desconto', offer.discount != null ? `${offer.discount}%` : '—'),
    configRow('Avaliação', escapeHtml(ratingLabel)),
    configRow(isAmazon ? 'Compras no mês' : 'Vendidos', escapeHtml(soldLabel)),
  ];

  if (!isAmazon && offer.salesRank) {
    rows.push(configRow('Ranking', escapeHtml(offer.salesRank)));
  }

  rows.push(
    configRow(
      'Vendedor',
      offer.seller
        ? `${escapeHtml(offer.seller)}${offer.officialStore ? ' <span class="meta">✅ Loja oficial</span>' : ''}`
        : '—',
    ),
  );

  if (isAmazon) {
    rows.push(
      configRow(
        'Cupom',
        coupon ? `<span class="coupon-badge">${escapeHtml(coupon)}</span>` : '—',
        'Desconto ativo na página do produto',
      ),
    );
  }

  rows.push(
    configRow('Mais vendido', offer.bestSeller ? '🏆 Sim' : '—'),
    configRow('Status', statusBadge(offer.sentAt)),
    configRow('Salva em', formatDate(offer.createdAt, env.APP_TIMEZONE)),
    configRow('Enviada em', formatDate(offer.sentAt, env.APP_TIMEZONE)),
    configRow('Página do produto', renderPermalinkCell(offer.permalink)),
    configRow(
      'Link afiliado',
      renderAffiliateLinkCell(offer.affiliateLink),
      isAmazon ? 'Formato: amazon.com.br/dp/ASIN?tag=sua-loja' : undefined,
    ),
    configRow(
      'Imagem',
      offer.image
        ? `<a class="link" href="${escapeHtml(offer.image)}" target="_blank" rel="noopener">Abrir imagem</a>`
        : '—',
    ),
  );

  const body = `
    <section>
      <p><a class="link" href="/manager/offers">← Voltar para ofertas</a></p>
      <div class="offer-detail-header">
        <div class="offer-detail-title-wrap">
          ${renderPlatformBadge(offer)}
          <h2>${escapeHtml(offer.title)}</h2>
        </div>
        <div class="offer-detail-actions">${headerActions}</div>
      </div>

      <div class="config-grid offer-detail-grid">
        ${rows.join('')}
      </div>
    </section>

    <section class="offer-detail-preview">
      <h2>Mensagem que o bot enviará</h2>
      <p class="meta"><a class="link" href="/manager/template">Editar template →</a></p>
      <pre class="message-preview">${escapeHtml(messagePreview)}</pre>
    </section>

    ${pageScripts('shared/confirm.js', 'shared/offer-delete.js', 'offer-detail.js')}`;

  return renderLayout('Detalhe da oferta', body, 'offers', pageStyles('offers.css', 'offer-detail.css'));
}

export function renderNotFound(message: string): string {
  const body = `<section><h2>Não encontrado</h2><p>${escapeHtml(message)}</p><p><a class="link" href="/manager">Dashboard</a></p></section>`;
  return renderLayout('404', body);
}
