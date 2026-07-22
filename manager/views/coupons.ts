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

function renderCouponsTable(coupons: CouponsPageData['coupons']): string {
  if (coupons.length === 0) {
    return '<p class="meta">Nenhum cupom carregado ainda. Clique em <strong>Atualizar cupons</strong> para buscar no Mercado Livre.</p>';
  }

  const rows = coupons
    .map(
      (coupon) => `<tr>
        <td><strong>${escapeHtml(coupon.title)}</strong>${coupon.description ? `<div class="meta">${escapeHtml(coupon.description.slice(0, 120))}${coupon.description.length > 120 ? '…' : ''}</div>` : ''}</td>
        <td>${coupon.discountLabel ? escapeHtml(coupon.discountLabel) : '—'}</td>
        <td>${coupon.code ? `<code>${escapeHtml(coupon.code)}</code>` : '—'}</td>
        <td>${coupon.category ? escapeHtml(coupon.category) : '—'}</td>
        <td>${coupon.minPurchase ? escapeHtml(coupon.minPurchase) : '—'}</td>
        <td>${coupon.expiresAt ? escapeHtml(coupon.expiresAt) : '—'}</td>
        <td>${statusBadge(coupon.status)}</td>
      </tr>`,
    )
    .join('');

  return `<table>
    <thead>
      <tr>
        <th>Cupom</th>
        <th>Desconto</th>
        <th>Código</th>
        <th>Categoria</th>
        <th>Compra mínima</th>
        <th>Validade</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

export function renderCouponsPage(data: CouponsPageData): string {
  const alert = data.error
    ? `<p class="alert err">${escapeHtml(data.error)}</p>`
    : data.refreshed
      ? `<p class="alert ok">${data.coupons.length} cupom(ns) encontrado(s)${data.source ? ` via ${data.source}` : ''}.</p>`
      : '';

  const sessionAlert = data.sessionOk
    ? `<p class="alert ok">Sessão ML: ${escapeHtml(data.sessionDetail)}</p>`
    : `<p class="alert err">Sessão ML: ${escapeHtml(data.sessionDetail)} — conecte em <a href="/manager/settings">Configuração</a>.</p>`;

  const meta = data.scrapedAt
    ? `<p class="meta">Última busca: ${formatDateTimeString(data.scrapedAt, env.APP_TIMEZONE)}</p>`
    : '';

  const body = `
    ${alert}
    ${sessionAlert}
  <section>
    <div class="coupons-header">
      <div>
        <h2>Cupons de afiliado</h2>
        <p class="meta">
          Busca cupons disponíveis para gerar no hub de afiliados do Mercado Livre.
          A URL de origem é configurável no <code>.env</code> (<code>ML_COUPONS_URL</code>).
        </p>
        <p class="meta">URL atual: <code>${escapeHtml(data.couponsUrl)}</code></p>
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
  </style>`;

  return renderLayout('Cupons', body, 'coupons');
}
