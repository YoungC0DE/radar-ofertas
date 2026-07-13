import type { DashboardData, DashboardOfferRow } from '../models/dashboard-model.js';
import { escapeHtml, formatCurrency, formatDate, statusBadge } from './helpers.js';
import { renderLayout } from './layout.js';

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

function renderOfferRow(row: DashboardOfferRow, timezone: string): string {
  const { offer, scheduleAt, isPending } = row;
  const scheduleLabel = isPending ? 'Previsão' : 'Enviada em';
  const actionCell = isPending
    ? `<form method="post" action="/manager/offers/${escapeHtml(offer.id)}/send-now" class="inline-form">
        <button type="submit" class="btn btn-sm primary">Enviar agora</button>
      </form>`
    : '—';

  return `<tr>
    <td><a class="link" href="/manager/offers/${escapeHtml(offer.id)}">${escapeHtml(offer.id.slice(0, 8))}…</a></td>
    <td>${escapeHtml(offer.title.slice(0, 60))}${offer.title.length > 60 ? '…' : ''}</td>
    <td>${offer.score}</td>
    <td>${formatCurrency(offer.price)}</td>
    <td>${statusBadge(offer.sentAt)}</td>
    <td title="${escapeHtml(scheduleLabel)}">${formatDate(scheduleAt, timezone)}</td>
    <td>${actionCell}</td>
  </tr>`;
}

function renderOffersTable(
  rows: DashboardOfferRow[],
  timezone: string,
  emptyMessage: string,
): string {
  if (rows.length === 0) {
    return `<tr><td colspan="7">${escapeHtml(emptyMessage)}</td></tr>`;
  }
  return rows.map((row) => renderOfferRow(row, timezone)).join('');
}

function formatPreviewCount(shown: number, total: number): string {
  if (total > shown) return `${shown} de ${total}`;
  return String(shown);
}

export function renderDashboard(data: DashboardData): string {
  const hoursLabel = `${String(data.operatingHours.start).padStart(2, '0')}:00 – ${
    data.operatingHours.end === 0 ? '24:00' : `${String(data.operatingHours.end).padStart(2, '0')}:00`
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

  const categoryRows = data.categories
    .map(
      (c) =>
        `<tr><td>${escapeHtml(c.category)}</td><td>${c.valid ? '<span class="badge ok">OK</span>' : '<span class="badge err">Inválida</span>'}</td><td>${escapeHtml(c.reason ?? c.listingKind)}</td></tr>`,
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
    ? `<tr><td colspan="7">${escapeHtml(data.database.error ?? 'Banco indisponível')}</td></tr>`
    : renderOffersTable(data.pendingOffers, data.timezone, 'Nenhuma oferta pendente.');

  const sentRows = !data.database.available
    ? ''
    : renderOffersTable(data.sentOffers, data.timezone, 'Nenhuma oferta enviada ainda.');

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
          ${queueRow('Envio de ofertas', data.queues.sender)}
        </tbody>
      </table>`
          : `<p class="meta"><span class="badge warn">Filas indisponíveis</span> — ${escapeHtml(data.queues.error ?? 'Redis offline')}</p>`
      }
    </section>

    <section>
      <h2>Categorias ML</h2>
      <table>
        <thead><tr><th>Categoria / URL</th><th>Status</th><th>Info</th></tr></thead>
        <tbody>${categoryRows}</tbody>
      </table>
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
      <table>
        <thead><tr><th>ID</th><th>Título</th><th>Score</th><th>Preço</th><th>Status</th><th>Horário</th><th>Ação</th></tr></thead>
        <tbody>${pendingRows}</tbody>
      </table>
      <h3 class="subsection-title">Últimas enviadas (${formatPreviewCount(data.sentOffers.length, data.stats.sent)})</h3>
      <table>
        <thead><tr><th>ID</th><th>Título</th><th>Score</th><th>Preço</th><th>Status</th><th>Horário</th><th>Ação</th></tr></thead>
        <tbody>${sentRows}</tbody>
      </table>
    </section>`;

  return renderLayout('Dashboard', body, 'dashboard');
}
