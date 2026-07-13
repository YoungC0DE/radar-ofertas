import type { OffersPageData } from '../models/offers-model.js';
import { env } from '../../src/config/env.js';
import { escapeHtml, formatCurrency, formatDate, statusBadge } from './helpers.js';
import { renderLayout } from './layout.js';

function filterLink(filter: string, label: string, active: string): string {
  const cls = filter === active ? ' class="active"' : '';
  return `<a href="/manager/offers?status=${filter}"${cls}>${escapeHtml(label)}</a>`;
}

export function renderOffersPage(
  data: OffersPageData,
  clearedCount: number | null = null,
  error: string | null = null,
): string {
  const rows =
    !data.database.available
      ? `<tr><td colspan="8">${escapeHtml(data.database.error ?? 'Banco indisponível')}</td></tr>`
      : data.offers.length === 0
      ? `<tr><td colspan="8">Nenhuma oferta encontrada.</td></tr>`
      : data.offers
          .map(
            (o) => {
              const scheduleAt = o.sentAt ? null : data.scheduleByOfferId.get(o.id) ?? null;
              const scheduleCell = scheduleAt
                ? formatDate(scheduleAt, env.APP_TIMEZONE)
                : '—';

              return `<tr>
          <td><a class="link" href="/manager/offers/${escapeHtml(o.id)}">${escapeHtml(o.id.slice(0, 10))}…</a></td>
          <td>${escapeHtml(o.title.slice(0, 50))}${o.title.length > 50 ? '…' : ''}</td>
          <td>${o.score}</td>
          <td>${formatCurrency(o.price)}</td>
          <td>${o.discount != null ? `${o.discount}%` : '—'}</td>
          <td>${statusBadge(o.sentAt)}</td>
          <td>${scheduleCell}</td>
          <td>${formatDate(o.sentAt ?? o.createdAt, env.APP_TIMEZONE)}</td>
        </tr>`;
            },
          )
          .join('');

  const prevPage = data.page > 1 ? data.page - 1 : null;
  const nextPage = data.page < data.totalPages ? data.page + 1 : null;
  const statusParam = data.filter === 'all' ? '' : `&status=${data.filter}`;

  const pagination = `
    <div class="pagination">
      ${prevPage ? `<a href="/manager/offers?page=${prevPage}${statusParam}">← Anterior</a>` : ''}
      Página ${data.page} de ${data.totalPages} (${data.total} ofertas)
      ${nextPage ? `<a href="/manager/offers?page=${nextPage}${statusParam}">Próxima →</a>` : ''}
    </div>`;

  const clearedAlert =
    clearedCount != null && clearedCount > 0
      ? `<p class="alert ok">${clearedCount} oferta(s) pendente(s) removida(s) com sucesso.</p>`
      : error
        ? `<p class="alert err">${escapeHtml(error)}</p>`
        : '';

  const deletePendingForm =
    data.database.available && data.pendingCount > 0
      ? `<form method="post" action="/manager/offers/delete-pending" class="danger-form" id="delete-pending-form">
          <button type="button" class="btn danger" id="delete-pending-btn">Remover todas pendentes (${data.pendingCount})</button>
        </form>`
      : '';

  const searchLimitForm = `
    <form method="post" action="/manager/offers/search-limit" class="inline-form" id="search-limit-form">
      <label for="search-limit-input" class="inline-label">Buscar até</label>
      <input
        type="number"
        id="search-limit-input"
        name="searchLimit"
        value="${data.searchLimit}"
        min="1"
        max="500"
        step="1"
        class="inline-input"
      >
      <span class="inline-label">ofertas</span>
      <button type="submit" class="btn btn-sm">Salvar</button>
    </form>`;

  const body = `
    <style>
      .section-actions {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
      }
      .inline-form {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .inline-label {
        font-size: 0.875rem;
        color: var(--text-muted);
        white-space: nowrap;
      }
      .inline-input {
        width: 72px;
        padding: 6px 8px;
        border: 1px solid var(--border);
        border-radius: 6px;
        background: var(--surface);
        color: var(--text);
        font-size: 0.875rem;
        text-align: center;
      }
    </style>
    <section>
      <div class="section-header">
        <h2>Ofertas</h2>
        <div class="section-actions">
          ${searchLimitForm}
          ${deletePendingForm}
        </div>
      </div>
      ${clearedAlert}
      ${
        !data.database.available
          ? `<p class="meta"><span class="badge err">PostgreSQL indisponível</span> — ${escapeHtml(data.database.error ?? 'erro de conexão')}</p>`
          : ''
      }
      <div class="filters">
        ${filterLink('all', 'Todas', data.filter)}
        ${filterLink('pending', 'Pendentes', data.filter)}
        ${filterLink('sent', 'Enviadas', data.filter)}
      </div>
      <table>
        <thead>
          <tr><th>ID</th><th>Título</th><th>Score</th><th>Preço</th><th>Desconto</th><th>Status</th><th>Previsão de envio</th><th>Data</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${pagination}
    </section>
    ${
      data.database.available && data.pendingCount > 0
        ? `<script>
      document.getElementById('delete-pending-btn').addEventListener('click', () => {
        radarConfirm({
          title: 'Remover ofertas pendentes',
          message: 'Remover todas as ${data.pendingCount} ofertas pendentes? Elas não serão enviadas ao WhatsApp.',
          confirmLabel: 'Remover',
          danger: true,
        }).then((ok) => {
          if (ok) document.getElementById('delete-pending-form').submit();
        });
      });
    </script>`
        : ''
    }`;

  return renderLayout('Ofertas', body, 'offers');
}
