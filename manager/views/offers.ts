import type { OffersPageData } from '../models/offers-model.js';
import { CHANNEL_LABELS } from '../../src/channels/types.js';
import type { DeliveryRecord } from '../../src/offers/types.js';
import { env } from '../../src/config/env.js';
import { escapeHtml, formatCurrency, formatDate, statusBadge } from './helpers.js';
import { renderLayout } from './layout.js';

function filterLink(filter: string, label: string, active: string): string {
  const cls = filter === active ? ' class="active"' : '';
  return `<a href="/manager/offers?status=${filter}"${cls}>${escapeHtml(label)}</a>`;
}

/** Badges de destino: um por canal que recebe a oferta, com o status da entrega. */
function renderDestino(deliveries: DeliveryRecord[] | undefined): string {
  if (!deliveries || deliveries.length === 0) {
    return '<span class="meta">—</span>';
  }

  return deliveries
    .map((delivery) => {
      const label = CHANNEL_LABELS[delivery.channel] ?? delivery.channel;
      const { cls, glyph, title } = delivery.sentAt
        ? { cls: 'dest-sent', glyph: '✓', title: 'Enviado' }
        : delivery.error
          ? { cls: 'dest-failed', glyph: '✗', title: `Falhou: ${delivery.error}` }
          : { cls: 'dest-pending', glyph: '•', title: 'Pendente' };
      return `<span class="dest-badge ${cls}" title="${escapeHtml(title)}">${escapeHtml(label)} ${glyph}</span>`;
    })
    .join(' ');
}

const TRASH_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;

export function renderOffersPage(
  data: OffersPageData,
  clearedCount: number | null = null,
  error: string | null = null,
  delaySaved = false,
): string {
  const rows =
    !data.database.available
      ? `<tr><td colspan="9">${escapeHtml(data.database.error ?? 'Banco indisponível')}</td></tr>`
      : data.offers.length === 0
      ? `<tr><td colspan="9">Nenhuma oferta encontrada.</td></tr>`
      : data.offers
          .map(
            (o) => {
              const scheduleAt = o.sentAt ? null : data.scheduleByOfferId.get(o.id) ?? null;
              const scheduleCell = scheduleAt
                ? formatDate(scheduleAt, env.APP_TIMEZONE)
                : '—';

              const deleteButton = o.sentAt
                ? ''
                : `<form method="post" action="/manager/offers/${escapeHtml(o.id)}/delete" class="offer-delete-form">
                    <button type="button" class="btn-trash offer-delete-btn" title="Apagar oferta pendente" aria-label="Apagar oferta">${TRASH_ICON}</button>
                  </form>`;

              return `<tr>
          <td><a class="link" href="/manager/offers/${escapeHtml(o.id)}">${escapeHtml(o.id.slice(0, 10))}…</a></td>
          <td><div class="dest-cell">${renderDestino(data.deliveriesByOfferId.get(o.id))}</div></td>
          <td>${escapeHtml(o.title.slice(0, 50))}${o.title.length > 50 ? '…' : ''}</td>
          <td>${o.score}</td>
          <td>${formatCurrency(o.price)}</td>
          <td>${o.discount != null ? `${o.discount}%` : '—'}</td>
          <td>${statusBadge(o.sentAt)}</td>
          <td>${scheduleCell}</td>
          <td>
            <div class="collected-cell">
              <span>${formatDate(o.createdAt, env.APP_TIMEZONE)}</span>
              ${deleteButton}
            </div>
          </td>
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
      : delaySaved
        ? '<p class="alert ok">Configuração de delay salva com sucesso.</p>'
        : error
          ? `<p class="alert err">${escapeHtml(error)}</p>`
          : '';

  const delayButtonLabel = data.affiliateDelay.backlogDelayMinutes === 1
    ? '1 min'
    : `${data.affiliateDelay.backlogDelayMinutes} min`;

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
    </form>
    <button type="button" class="btn btn-sm" id="edit-affiliate-delay-btn" title="Configurar delay entre chamadas de link de afiliado">
      Delay (${delayButtonLabel})
    </button>`;

  const deletePendingForm =
    data.database.available && data.pendingCount > 0
      ? `<form method="post" action="/manager/offers/delete-pending" class="danger-form" id="delete-pending-form">
          <button type="button" class="btn danger" id="delete-pending-btn">Remover todas pendentes (${data.pendingCount})</button>
        </form>`
      : '';

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
      .collected-cell {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .dest-cell {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .dest-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 20px;
        font-size: 0.72rem;
        font-weight: 600;
        white-space: nowrap;
      }
      .dest-sent { background: #dcfce7; color: #166534; }
      .dest-pending { background: #fef9c3; color: #854d0e; }
      .dest-failed { background: #fee2e2; color: #991b1b; }
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
          <tr><th>ID</th><th>Destino</th><th>Título</th><th>Score</th><th>Preço</th><th>Desconto</th><th>Status</th><th>Previsão de envio</th><th>Coletada em</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${pagination}
    </section>

    <div id="affiliate-delay-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="affiliate-delay-modal-title">
        <div class="modal-header">
          <h3 id="affiliate-delay-modal-title">Delay entre chamadas de afiliado</h3>
        </div>
        <form method="post" action="/manager/offers/affiliate-delay">
          <div class="modal-body">
            <label for="modal-affiliate-delay-ms" class="modal-label">Delay normal (milissegundos)</label>
            <input
              type="number"
              id="modal-affiliate-delay-ms"
              name="affiliateDelayMs"
              value="${data.affiliateDelay.delayMs}"
              min="0"
              max="60000"
              step="100"
              required
              class="modal-input"
            >
            <p class="modal-help">Intervalo entre chamadas à API de link de afiliado quando o backlog está baixo (ex: 500 = meio segundo).</p>

            <label for="modal-affiliate-backlog-threshold" class="modal-label">Pendentes para desacelerar</label>
            <input
              type="number"
              id="modal-affiliate-backlog-threshold"
              name="affiliateBacklogThreshold"
              value="${data.affiliateDelay.backlogThreshold}"
              min="1"
              max="100"
              step="1"
              required
              class="modal-input"
            >
            <p class="modal-help">Quando houver esta quantidade (ou mais) de ofertas pendentes de envio, o delay de backlog passa a valer.</p>

            <label for="modal-affiliate-backlog-delay-minutes" class="modal-label">Delay com backlog (minutos)</label>
            <input
              type="number"
              id="modal-affiliate-backlog-delay-minutes"
              name="affiliateBacklogDelayMinutes"
              value="${data.affiliateDelay.backlogDelayMinutes}"
              min="1"
              max="60"
              step="1"
              required
              class="modal-input"
            >
            <p class="modal-help">Intervalo entre chamadas quando o limite de pendentes for atingido (1 a 60 min).</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn modal-cancel" data-modal="affiliate-delay-modal">Cancelar</button>
            <button type="submit" class="btn primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>

    <script>
      const affiliateDelayModal = document.getElementById('affiliate-delay-modal');

      function openModal(modal) {
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        const focusable = modal.querySelector('input, button, textarea, select');
        focusable?.focus();
      }

      function closeModal(modal) {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        if (document.querySelectorAll('.modal-overlay:not(.hidden)').length === 0) {
          document.body.style.overflow = '';
        }
      }

      document.getElementById('edit-affiliate-delay-btn')?.addEventListener('click', () => {
        openModal(affiliateDelayModal);
      });

      affiliateDelayModal?.querySelector('.modal-cancel')?.addEventListener('click', () => {
        closeModal(affiliateDelayModal);
      });

      affiliateDelayModal?.addEventListener('click', (event) => {
        if (event.target === affiliateDelayModal) closeModal(affiliateDelayModal);
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && affiliateDelayModal && !affiliateDelayModal.classList.contains('hidden')) {
          closeModal(affiliateDelayModal);
        }
      });
      ${
        data.database.available && data.pendingCount > 0
          ? `
      document.getElementById('delete-pending-btn').addEventListener('click', () => {
        radarConfirm({
          title: 'Remover ofertas pendentes',
          message: 'Remover todas as ${data.pendingCount} ofertas pendentes? Elas não serão enviadas ao WhatsApp.',
          confirmLabel: 'Remover',
          danger: true,
        }).then((ok) => {
          if (ok) document.getElementById('delete-pending-form').submit();
        });
      });`
          : ''
      }

      document.querySelectorAll('.offer-delete-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          radarConfirm({
            title: 'Apagar oferta',
            message: 'Apagar esta oferta pendente? Ela não será enviada ao WhatsApp.',
            confirmLabel: 'Apagar',
            danger: true,
          }).then((ok) => {
            if (ok) btn.closest('form').submit();
          });
        });
      });
    </script>`;

  return renderLayout('Ofertas', body, 'offers');
}
