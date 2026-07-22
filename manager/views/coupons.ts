import type { CouponsPageData } from '../models/coupons-model.js';
import { escapeHtml, formatDateTimeString } from './helpers.js';
import { renderLayout } from './layout.js';
import { env } from '../../src/config/env.js';

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    available: 'Disponível',
    generated: 'Gerado',
    expired: 'Expirado',
    unknown: '—',
  };
  const label = map[status] ?? status;
  const cls = status === 'available' ? 'sent' : status === 'expired' ? 'err' : '';
  return `<span class="badge ${cls}">${escapeHtml(label)}</span>`;
}

function renderStoreLinkField(coupon: CouponsPageData['coupons'][number]): string {
  const value = coupon.storeUrl ?? '';
  return `<form method="post" action="/manager/coupons/${encodeURIComponent(coupon.id)}/store-link" class="store-link-form">
    ${coupon.code ? `<input type="hidden" name="code" value="${escapeHtml(coupon.code)}">` : ''}
    <input
      type="url"
      name="storeUrl"
      value="${escapeHtml(value)}"
      placeholder="https://lista.mercadolivre.com.br/..."
      class="store-link-input"
      title="Link completo da loja — será encurtado ao enviar"
    >
    <button type="submit" class="btn btn-sm">Salvar</button>
  </form>`;
}

function renderSendAction(coupon: CouponsPageData['coupons'][number]): string {
  if (coupon.status !== 'available') return '—';
  return `<form method="post" action="/manager/coupons/${encodeURIComponent(coupon.id)}/send" class="inline-form">
    ${coupon.code ? `<input type="hidden" name="code" value="${escapeHtml(coupon.code)}">` : ''}
    <button type="submit" class="btn btn-sm primary">Enviar ao canal</button>
  </form>`;
}

function renderCouponsTable(coupons: CouponsPageData['coupons']): string {
  if (coupons.length === 0) {
    return '<p class="meta">Nenhum cupom carregado ainda. Clique em <strong>Atualizar cupons</strong> para buscar no Mercado Livre.</p>';
  }

  const rows = coupons
    .map(
      (coupon) => `<tr>
        <td><strong>${escapeHtml(coupon.storeName || coupon.title)}</strong>${coupon.description ? `<div class="meta">${escapeHtml(coupon.description.slice(0, 120))}${coupon.description.length > 120 ? '…' : ''}</div>` : ''}</td>
        <td>${coupon.discountLabel ? escapeHtml(coupon.discountLabel) : '—'}</td>
        <td>${coupon.code ? `<code>${escapeHtml(coupon.code)}</code>` : '—'}</td>
        <td>${renderStoreLinkField(coupon)}</td>
        <td>${coupon.category ? escapeHtml(coupon.category) : '—'}</td>
        <td>${coupon.minPurchase ? escapeHtml(coupon.minPurchase) : '—'}</td>
        <td>${coupon.expiresAt ? escapeHtml(coupon.expiresAt) : '—'}</td>
        <td>${statusBadge(coupon.status)}</td>
        <td>${renderSendAction(coupon)}</td>
      </tr>`,
    )
    .join('');

  return `<table>
    <thead>
      <tr>
        <th>Cupom</th>
        <th>Desconto</th>
        <th>Código</th>
        <th>Link da loja</th>
        <th>Categoria</th>
        <th>Compra mínima</th>
        <th>Validade</th>
        <th>Status</th>
        <th>Ação</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

export function renderCouponsPage(data: CouponsPageData): string {
  const alert = data.error
    ? `<p class="alert err">${escapeHtml(data.error)}</p>`
    : data.sendMessage
      ? `<p class="alert ok">${escapeHtml(data.sendMessage)}</p>`
      : data.refreshed
        ? `<p class="alert ok">${data.coupons.length} cupom(ns) encontrado(s)${data.source ? ` via ${data.source}` : ''}.</p>`
        : '';


  const meta = data.scrapedAt
    ? `<p class="meta">Última busca: ${formatDateTimeString(data.scrapedAt, env.APP_TIMEZONE)}</p>`
    : '';

  const body = `
    ${alert}
  <section>
    <div class="coupons-header">
      <div>
        <h2>Cupons de afiliado</h2>
        ${meta}
      </div>
      <form method="post" action="/manager/coupons/refresh" class="inline-form">
        <button type="submit" class="btn primary">Atualizar cupons</button>
      </form>
    </div>

    ${renderCouponsTable(data.coupons)}
  </section>

  <style>
    .coupons-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .coupons-header h2 { margin-top: 0; }
    table code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.9em;
    }
    .store-link-form {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 220px;
      margin: 0;
    }
    .store-link-input {
      width: 100%;
      min-width: 200px;
      padding: 6px 8px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.82rem;
    }
    .store-link-input:focus {
      outline: 2px solid #2563eb;
      outline-offset: 1px;
      border-color: #2563eb;
    }
  </style>`;

  return renderLayout('Cupons', body, 'coupons');
}
