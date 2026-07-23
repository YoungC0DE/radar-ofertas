import { renderLayout } from './layout.js';
import { escapeHtml } from './helpers.js';
import { pageScripts, pageStyles } from './page-assets.js';
import type { SourcesPageData } from '../models/sources-model.js';
import type { AmazonSourceRow } from '../../src/config/amazon-sources-config.js';
import type { MlCategoryRow } from '../../src/config/ml-sources-config.js';

function listingKindLabel(kind: string): string {
  if (kind === 'offers') return 'Ofertas';
  if (kind === 'browse_node') return 'Recomendações';
  if (kind === 'search') return 'Busca';
  if (kind === 'product') return 'Produto';
  return 'Categoria';
}

function statusBadge(row: { valid: boolean }, active: boolean): string {
  if (!row.valid) return '<span class="badge err">Inválida</span>';
  return active
    ? '<span class="badge ok">Coletando</span>'
    : '<span class="badge warn">Fora</span>';
}

function otherChannelsHint(channels: string[], channel: string): string {
  const others = channels.filter((c) => c !== channel);
  if (others.length === 0) return '';
  return `<div class="ml-source-others meta">Também: ${others.join(', ')}</div>`;
}

function renderMlRow(row: MlCategoryRow, channel: string, options?: { removable?: boolean }): string {
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
      ${otherChannelsHint(row.channels, channel)}
    </td>
    <td>${origin}</td>
    <td><span class="badge">${listingKindLabel(row.listingKind)}</span></td>
    <td>${statusBadge(row, active)}</td>
    <td>${escapeHtml(row.reason ?? listingKindLabel(row.listingKind))}</td>
    <td>${removeCell}</td>
  </tr>`;
}

function renderAmazonRow(
  row: AmazonSourceRow,
  channel: string,
  options?: { removable?: boolean },
): string {
  const active = row.channels.includes(channel as never);
  const origin = row.fromEnv
    ? '<span class="badge">.env</span>'
    : '<span class="badge">Extra</span>';
  const coletarCell = `<label class="ml-source-flag">
        <input type="checkbox" name="coletar_amazon_${escapeHtml(row.id)}" value="1"${active ? ' checked' : ''}>
        Coletar
      </label>`;
  const removeCell = options?.removable
    ? `<button type="submit" formaction="/manager/sources/${channel}/remove-amazon/${encodeURIComponent(row.id)}" formmethod="post" class="btn btn-sm btn-danger" title="Remover link">Remover</button>`
    : '';

  return `<tr>
    <td>${coletarCell}</td>
    <td>
      <div class="ml-source-label">${escapeHtml(row.label)}</div>
      <div class="ml-source-url meta" title="${escapeHtml(row.source)}">${escapeHtml(row.source)}</div>
      ${otherChannelsHint(row.channels, channel)}
    </td>
    <td>${origin}</td>
    <td><span class="badge">${listingKindLabel(row.kind)}</span></td>
    <td>${statusBadge(row, active)}</td>
    <td>${escapeHtml(row.reason ?? listingKindLabel(row.kind))}</td>
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

  const mlEnvRows = data.mlRows.filter((row) => row.fromEnv);
  const mlCustomRows = data.mlRows.filter((row) => !row.fromEnv);
  const amazonEnvRows = data.amazonRows.filter((row) => row.fromEnv);
  const amazonCustomRows = data.amazonRows.filter((row) => !row.fromEnv);

  const mlEnvTable =
    mlEnvRows.length === 0
      ? '<tr><td colspan="7">Nenhuma categoria no .env.</td></tr>'
      : mlEnvRows.map((row) => renderMlRow(row, channel)).join('');

  const mlCustomTable =
    mlCustomRows.length === 0
      ? '<tr><td colspan="7">Nenhum link extra cadastrado.</td></tr>'
      : mlCustomRows.map((row) => renderMlRow(row, channel, { removable: true })).join('');

  const amazonEnvTable =
    amazonEnvRows.length === 0
      ? '<tr><td colspan="7">Nenhuma fonte no .env (AMAZON_SOURCES).</td></tr>'
      : amazonEnvRows.map((row) => renderAmazonRow(row, channel)).join('');

  const amazonCustomTable =
    amazonCustomRows.length === 0
      ? '<tr><td colspan="7">Nenhum link extra cadastrado.</td></tr>'
      : amazonCustomRows.map((row) => renderAmazonRow(row, channel, { removable: true })).join('');

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
          <p class="meta">Marque as fontes que devem ser coletadas e enviadas para o <strong>${escapeHtml(channelLabel)}</strong>. Cada canal tem sua própria seleção. <strong>${data.activeCount}</strong> fonte(s) ativa(s) neste canal.</p>
        </div>
      </div>

      ${tabs}

      <form method="post" action="/manager/sources/${channel}">
        <div class="ml-sources-platform-head">
          <h3 class="ml-sources-group-title">Mercado Livre</h3>
          <button type="button" class="btn btn-sm" id="add-ml-source">Adicionar link ML</button>
        </div>
        <h4 class="ml-sources-subtitle">Do .env</h4>
        <table class="ml-sources-table">
          ${tableHead()}
          <tbody>${mlEnvTable}</tbody>
        </table>

        <h4 class="ml-sources-subtitle">Links extras</h4>
        <table class="ml-sources-table">
          ${tableHead()}
          <tbody>${mlCustomTable}</tbody>
        </table>

        <div class="ml-sources-platform-head" style="margin-top:24px">
          <h3 class="ml-sources-group-title">Amazon</h3>
          <button type="button" class="btn btn-sm" id="add-amazon-source">Adicionar link Amazon</button>
        </div>
        <h4 class="ml-sources-subtitle">Do .env</h4>
        <table class="ml-sources-table">
          ${tableHead()}
          <tbody>${amazonEnvTable}</tbody>
        </table>

        <h4 class="ml-sources-subtitle">Links extras</h4>
        <table class="ml-sources-table">
          ${tableHead()}
          <tbody>${amazonCustomTable}</tbody>
        </table>

        <div class="ml-sources-save">
          <button type="submit" class="btn primary">Salvar seleção do ${escapeHtml(channelLabel)}</button>
        </div>
      </form>
    </section>

    <div id="ml-source-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="ml-source-modal-title">
        <div class="modal-header">
          <h3 id="ml-source-modal-title">Adicionar link Mercado Livre</h3>
        </div>
        <form method="post" action="/manager/sources/${channel}/add">
          <div class="modal-body">
            <label for="modal-ml-source-label" class="modal-label">Nome (opcional)</label>
            <input type="text" name="label" id="modal-ml-source-label" class="modal-input" placeholder="Ex.: Ofertas relâmpago">
            <label for="modal-ml-source-url" class="modal-label" style="margin-top:12px;">Link do Mercado Livre</label>
            <input type="text" name="url" id="modal-ml-source-url" class="modal-input" placeholder="https://www.mercadolivre.com.br/ofertas?..." required>
            <p class="modal-help">O link entra ativo só neste canal (${escapeHtml(channelLabel)}).</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn modal-cancel" id="ml-source-cancel">Cancelar</button>
            <button type="submit" class="btn primary">Adicionar</button>
          </div>
        </form>
      </div>
    </div>

    <div id="amazon-source-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="amazon-source-modal-title">
        <div class="modal-header">
          <h3 id="amazon-source-modal-title">Adicionar link Amazon</h3>
        </div>
        <form method="post" action="/manager/sources/${channel}/add-amazon">
          <div class="modal-body">
            <label for="modal-amazon-source-label" class="modal-label">Nome (opcional)</label>
            <input type="text" name="label" id="modal-amazon-source-label" class="modal-input" placeholder="Ex.: Recomendações beleza">
            <label for="modal-amazon-source-url" class="modal-label" style="margin-top:12px;">Link Amazon</label>
            <input type="text" name="url" id="modal-amazon-source-url" class="modal-input" placeholder="https://www.amazon.com.br/b/node/..." required>
            <p class="modal-help">Browse node (/b/node/), busca (/s?) ou produto (/dp/). Ativo só neste canal.</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn modal-cancel" id="amazon-source-cancel">Cancelar</button>
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
