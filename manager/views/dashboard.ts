import type { DeliveryRecord } from '../../src/offers/types.js';
import type { DashboardData, DashboardOfferRow } from '../models/dashboard-model.js';
import { escapeHtml, formatCurrency, formatDate, statusBadge } from './helpers.js';
import { renderDestino, renderPlatformBadge } from './offer-cells.js';
import { renderLayout } from './layout.js';
import { pageScripts, pageStyles } from './page-assets.js';

const TRASH_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;

const OFFER_TABLE_HEADERS =
  '<tr><th>Origem</th><th>ID</th><th>Destino</th><th>Título</th><th>Score</th><th>Preço</th><th>Desconto</th><th>Status</th><th>Previsão de envio</th><th>Coletada em</th></tr>';

const OFFER_TABLE_COLSPAN = 10;

function sessionBadge(ok: boolean): string {
  return ok ? '<span class="badge ok">OK</span>' : '<span class="badge err">Atenção</span>';
}

function queueRow(label: string, counts: DashboardData['queues']['collector']): string {
  return `<tr>
    <td>${escapeHtml(label)}</td>
    <td>${counts.waiting}</td>
    <td>${counts.active}</td>
    <td>${counts.delayed}</td>
    <td>${counts.failed}</td>
    <td>${counts.completed}</td>
  </tr>`;
}

function renderOfferRow(
  row: DashboardOfferRow,
  timezone: string,
  deliveriesByOfferId: Map<string, DeliveryRecord[]>,
): string {
  const { offer, scheduleAt, isPending } = row;
  const scheduleCell = scheduleAt ? formatDate(scheduleAt, timezone) : '—';

  const pendingActions = isPending
    ? `<form method="post" action="/manager/offers/${escapeHtml(offer.id)}/send-now" class="inline-form">
          <button type="submit" class="btn btn-sm primary">Enviar agora</button>
        </form>
        <form method="post" action="/manager/offers/${escapeHtml(offer.id)}/delete" class="offer-delete-form">
          <button type="button" class="btn-trash offer-delete-btn" title="Apagar oferta pendente" aria-label="Apagar oferta">${TRASH_ICON}</button>
        </form>`
    : '';

  return `<tr>
    <td>${renderPlatformBadge(offer)}</td>
    <td><a class="link" href="/manager/offers/${escapeHtml(offer.id)}">${escapeHtml(offer.id.slice(0, 10))}…</a></td>
    <td><div class="dest-cell">${renderDestino(deliveriesByOfferId.get(offer.id))}</div></td>
    <td>${escapeHtml(offer.title.slice(0, 50))}${offer.title.length > 50 ? '…' : ''}</td>
    <td>${offer.score}</td>
    <td>${formatCurrency(offer.price)}</td>
    <td>${offer.discount != null ? `${offer.discount}%` : '—'}</td>
    <td>${statusBadge(offer.sentAt)}</td>
    <td>${scheduleCell}</td>
    <td>
      <div class="collected-cell">
        <span>${formatDate(offer.createdAt, timezone)}</span>
        ${pendingActions}
      </div>
    </td>
  </tr>`;
}

function renderOffersTable(
  rows: DashboardOfferRow[],
  timezone: string,
  deliveriesByOfferId: DashboardData['deliveriesByOfferId'],
  emptyMessage: string,
): string {
  if (rows.length === 0) {
    return `<tr><td colspan="${OFFER_TABLE_COLSPAN}">${escapeHtml(emptyMessage)}</td></tr>`;
  }
  return rows.map((row) => renderOfferRow(row, timezone, deliveriesByOfferId)).join('');
}

function formatPreviewCount(shown: number, total: number): string {
  if (total > shown) return `${shown} de ${total}`;
  return String(shown);
}

export function renderDashboard(data: DashboardData): string {
  const hoursLabel = `${String(data.operatingHours.start).padStart(2, '0')}:00 – ${
    data.operatingHours.end === 0
      ? '24:00'
      : `${String(data.operatingHours.end).padStart(2, '0')}:00`
  }`;

  const lastSentLabel = data.lastSentAt
    ? formatDate(data.lastSentAt, data.timezone)
    : 'Nenhum envio ainda';

  const hoursValue = `${hoursLabel} <span class="meta">· Último envio: ${escapeHtml(lastSentLabel)}</span>`;

  const sessionRows = data.sessions
    .map(
      (s) =>
        `<tr><td>${escapeHtml(s.label)}</td><td>${sessionBadge(s.ok)}</td><td>${escapeHtml(s.detail)}</td></tr>`,
    )
    .join('');

  const sendNowAlert = data.sendNowMessage
    ? `<p class="alert ok">${escapeHtml(data.sendNowMessage)}</p>`
    : data.sendNowError
      ? `<p class="alert err">${escapeHtml(data.sendNowError)}</p>`
      : '';

  const collectAlert = data.collectMessage
    ? `<p class="alert ok">${escapeHtml(data.collectMessage)}</p>`
    : data.collectError
      ? `<p class="alert err">${escapeHtml(data.collectError)}</p>`
      : '';

  const pendingRows = !data.database.available
    ? `<tr><td colspan="${OFFER_TABLE_COLSPAN}">${escapeHtml(data.database.error ?? 'Banco indisponível')}</td></tr>`
    : renderOffersTable(
        data.pendingOffers,
        data.timezone,
        data.deliveriesByOfferId,
        'Nenhuma oferta pendente.',
      );

  const sentRows = !data.database.available
    ? ''
    : renderOffersTable(
        data.sentOffers,
        data.timezone,
        data.deliveriesByOfferId,
        'Nenhuma oferta enviada ainda.',
      );

  const body = `
    ${
      !data.database.available
        ? `<section><p class="meta"><span class="badge err">PostgreSQL indisponível</span> — ${escapeHtml(data.database.error ?? 'erro de conexão')}. Confira <code>DATABASE_URL</code> no <code>.env</code> e rode <code>npm run migrate:deploy</code>.</p></section>`
        : ''
    }
    <div class="dashboard-top">
      <div class="stats-col">
        <div class="cards">
          <div class="card"><div class="label">Total salvas</div><div class="value">${data.stats.total}</div></div>
          <div class="card"><div class="label">Pendentes</div><div class="value">${data.stats.pending}</div></div>
          <div class="card"><div class="label">Enviadas</div><div class="value">${data.stats.sent}</div></div>
          <div class="card">
            <div class="card-label-row">
              <div class="label">Horário</div>
              ${
                data.withinOperatingHours
                  ? '<span class="badge ok">Ativo</span>'
                  : '<span class="badge warn">Fora</span>'
              }
            </div>
            <div class="value card-hours-value">${hoursValue}</div>
          </div>
        </div>
      </div>

      <section class="sessions-panel">
        <h2>Sessões</h2>
        <table>
          <thead><tr><th>Serviço</th><th>Status</th><th>Detalhe</th></tr></thead>
          <tbody>${sessionRows}</tbody>
        </table>
      </section>
    </div>

    <section>
      <h2>Filas</h2>
      ${
        data.queues.available
          ? `<table>
        <thead><tr><th>Fila</th><th>Aguardando</th><th>Em execução</th><th>Agendados</th><th>Falhas</th><th>Concluídos</th></tr></thead>
        <tbody>
          ${queueRow('Coletor de ofertas', data.queues.collector)}
          ${data.queues.senders
            .map((sender) => queueRow(`Envio de ofertas — ${sender.label}`, sender.counts))
            .join('')}
        </tbody>
      </table>`
          : `<p class="meta"><span class="badge warn">Filas indisponíveis</span> — ${escapeHtml(data.queues.error ?? 'Redis offline')}</p>`
      }
    </section>

    <section>
      <h2>Últimas ofertas salvas</h2>
      ${sendNowAlert}
      ${collectAlert}
      <div class="subsection-heading">
        <h3 class="subsection-title">Próximas pendentes (${formatPreviewCount(data.pendingOffers.length, data.stats.pending)})</h3>
        <form method="post" action="/manager/offers/collect" class="inline-form">
          <button type="submit" class="btn btn-sm primary">Buscar novos anúncios</button>
        </form>
      </div>
      <div class="offers-table-wrap">
      <table>
        <thead>${OFFER_TABLE_HEADERS}</thead>
        <tbody>${pendingRows}</tbody>
      </table>
      </div>
      <h3 class="subsection-title">Últimas enviadas (${formatPreviewCount(data.sentOffers.length, data.stats.sent)})</h3>
      <div class="offers-table-wrap">
      <table>
        <thead>${OFFER_TABLE_HEADERS}</thead>
        <tbody>${sentRows}</tbody>
      </table>
      </div>
    </section>

    ${pageScripts('shared/offer-delete.js')}`;

  return renderLayout('Dashboard', body, 'dashboard', pageStyles('offers.css', 'dashboard.css'));
}
