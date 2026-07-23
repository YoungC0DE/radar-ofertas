import { renderLayout } from './layout.js';
import { escapeHtml } from './helpers.js';
import { pageScripts, pageStyles } from './page-assets.js';
import type { SourcesPageData } from '../models/sources-model.js';
import type { MlCategoryRow } from '../../src/config/ml-sources-config.js';

function listingKindLabel(kind: string): string {
  return kind === 'offers' ? 'Ofertas' : 'Categoria';
}

function statusBadge(row: MlCategoryRow, active: boolean): string {
  if (!row.valid) return '<span class="badge err">Inválida</span>';
  return active
    ? '<span class="badge ok">Coletando</span>'
    : '<span class="badge warn">Fora</span>';
}

/** Quais OUTROS canais também coletam esta fonte — ajuda a ver o cenário completo. */
function otherChannelsHint(row: MlCategoryRow, channel: string): string {
  const others = row.channels.filter((c) => c !== channel);
  if (others.length === 0) return '';
  return `<div class="ml-source-others meta">Também: ${others.join(', ')}</div>`;
}

function renderRow(row: MlCategoryRow, channel: string, options?: { removable?: boolean }): string {
  const active = row.channels.includes(channel as never);
  const origin = row.fromEnv
    ? '<span class="badge">.env</span>'
    : '<span class="badge">Extra</span>';
  const coletarCell = `<label class="ml-source-flag">
        <input type="checkbox" name="coletar_${escapeHtml(row.id)}" value="1"${active ? ' checked' : ''}>
        Coletar
      </label>`;
  const removeCell = options?.removable
    ? `<button type="submit" formaction="/manager/sources/${channel}/remove/${encodeURIComponent(row.id)}" formmethod="post" class="btn btn-sm btn-danger" title="Remover link">Remover</button>`
    : '';

  return `<tr>
    <td>${coletarCell}</td>
    <td>
      <div class="ml-source-label">${escapeHtml(row.label)}</div>
      <div class="ml-source-url meta" title="${escapeHtml(row.category)}">${escapeHtml(row.category)}</div>
      ${otherChannelsHint(row, channel)}
    </td>
    <td>${origin}</td>
    <td><span class="badge">${listingKindLabel(row.listingKind)}</span></td>
    <td>${statusBadge(row, active)}</td>
    <td>${escapeHtml(row.reason ?? listingKindLabel(row.listingKind))}</td>
    <td>${removeCell}</td>
  </tr>`;
}

function tableHead(): string {
  return `<thead>
      <tr>
        <th>Coletar</th>
        <th>Nome / URL</th>
        <th>Origem</th>
        <th>Tipo</th>
        <th>Status</th>
        <th>Info</th>
        <th></th>
      </tr>
    </thead>`;
}

export function renderSourcesPage(data: SourcesPageData): string {
  const { channel, channelLabel } = data;

  const alert =
    data.saved === 'flags'
      ? '<p class="alert ok">Fontes atualizadas com sucesso.</p>'
      : data.saved === 'added'
        ? '<p class="alert ok">Link adicionado com sucesso.</p>'
        : data.saved === 'removed'
          ? '<p class="alert ok">Link removido com sucesso.</p>'
          : data.error
            ? `<p class="alert err">${escapeHtml(data.error)}</p>`
            : '';

  const envRows = data.rows.filter((row) => row.fromEnv);
  const customRows = data.rows.filter((row) => !row.fromEnv);

  const envTable =
    envRows.length === 0
      ? '<tr><td colspan="7">Nenhuma categoria no .env.</td></tr>'
      : envRows.map((row) => renderRow(row, channel)).join('');

  const customTable =
    customRows.length === 0
      ? '<tr><td colspan="7">Nenhum link extra cadastrado.</td></tr>'
      : customRows.map((row) => renderRow(row, channel, { removable: true })).join('');

  // Abas: só aparecem quando há mais de um canal ligado (senão não há o que trocar).
  const tabs =
    data.channels.length > 1
      ? `<div class="filters sources-tabs">
        ${data.channels
          .map(
            (c) =>
              `<a href="/manager/sources/${c.channel}" class="${c.active ? 'active' : ''}">${escapeHtml(c.label)}</a>`,
          )
          .join('')}
      </div>`
      : '';

  const body = `
    ${alert}

    <section>
      <div class="ml-sources-head">
        <div>
          <h2>Fontes de coleta — ${escapeHtml(channelLabel)}</h2>
          <p class="meta">Marque as fontes que devem ser coletadas e enviadas para o <strong>${escapeHtml(channelLabel)}</strong>. Cada canal tem sua própria seleção — uma fonte pode ir só para um canal, para vários ou para nenhum. <strong>${data.activeCount}</strong> fonte(s) ativa(s) neste canal.</p>
        </div>
        <button type="button" class="btn btn-sm" id="add-ml-source">Adicionar link</button>
      </div>

      ${tabs}

      <form method="post" action="/manager/sources/${channel}">
        <h4 class="ml-sources-group-title">Do .env</h4>
        <table class="ml-sources-table">
          ${tableHead()}
          <tbody>${envTable}</tbody>
        </table>

        <h4 class="ml-sources-group-title">Links extras</h4>
        <table class="ml-sources-table">
          ${tableHead()}
          <tbody>${customTable}</tbody>
        </table>

        <div class="ml-sources-save">
          <button type="submit" class="btn primary">Salvar seleção do ${escapeHtml(channelLabel)}</button>
        </div>
      </form>
    </section>

    <div id="ml-source-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="ml-source-modal-title">
        <div class="modal-header">
          <h3 id="ml-source-modal-title">Adicionar link de ofertas</h3>
        </div>
        <form method="post" action="/manager/sources/${channel}/add">
          <div class="modal-body">
            <label for="modal-ml-source-label" class="modal-label">Nome (opcional)</label>
            <input type="text" name="label" id="modal-ml-source-label" class="modal-input" placeholder="Ex.: Ofertas relâmpago">
            <label for="modal-ml-source-url" class="modal-label" style="margin-top:12px;">Link do Mercado Livre</label>
            <input type="text" name="url" id="modal-ml-source-url" class="modal-input" placeholder="https://www.mercadolivre.com.br/ofertas?..." required>
            <p class="modal-help">O link entra ativo só neste canal (${escapeHtml(channelLabel)}). Você pode ativá-lo em outros canais nas respectivas páginas.</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn modal-cancel" id="ml-source-cancel">Cancelar</button>
            <button type="submit" class="btn primary">Adicionar</button>
          </div>
        </form>
      </div>
    </div>

    ${pageScripts('shared/modal.js', 'sources.js')}`;

  return renderLayout(
    `Fontes — ${channelLabel}`,
    body,
    `sources-${channel}`,
    pageStyles('sources.css'),
  );
}
