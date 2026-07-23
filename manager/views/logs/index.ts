import type { ClassifiedLogEntry, ClassifiedMlScrapeEntry } from '../../models/logs/log-classifier.js';
import type { LogsPageData } from '../../models/logs-model.js';
import { escapeHtml } from '../helpers.js';
import { renderLayout } from '../layout.js';
import { pageData, pageScripts, pageStyles } from '../page-assets.js';

function formatLogTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function renderLogLine(entry: ClassifiedLogEntry): string {
  const metaEncoded = encodeURIComponent(JSON.stringify(entry.meta, null, 2));

  return `<div class="audit-line audit-level-${escapeHtml(entry.level)}" data-level="${escapeHtml(entry.level)}" data-source="${escapeHtml(entry.source)}" data-search="${escapeHtml(entry.searchBlob)}" data-meta="${metaEncoded}">
    <span class="audit-ts">${formatLogTime(entry.timestamp)}</span>
    <span class="audit-level ${entry.chipClass}">[${escapeHtml(entry.chip)}]</span>
    <span class="audit-source">${escapeHtml(entry.source)}</span>
    <span class="audit-sep">›</span>
    <span class="audit-module">${escapeHtml(entry.module)}</span>
    <span class="audit-action">${escapeHtml(entry.action)}</span>
    <span class="audit-msg">${escapeHtml(entry.message)}</span>
    ${entry.metaTrail ? `<span class="audit-meta">${escapeHtml(entry.metaTrail)}</span>` : ''}
  </div>`;
}

function renderMlScrapeLine(entry: ClassifiedMlScrapeEntry): string {
  const metaEncoded = encodeURIComponent(JSON.stringify(entry.meta, null, 2));

  return `<div class="ml-scrape-line ${entry.statusClass}" data-meta="${metaEncoded}" title="${escapeHtml(entry.detail)}">
    <span class="ml-scrape-ts">${formatLogTime(entry.timestamp)}</span>
    <span class="ml-scrape-status">${entry.status}</span>
    <span class="ml-scrape-method">${escapeHtml(entry.method)}</span>
    <span class="ml-scrape-detail">${escapeHtml(entry.detail)}</span>
  </div>`;
}

export function renderLogsPage(data: LogsPageData): string {
  const lines =
    data.logs.length === 0
      ? '<div class="audit-empty">Aguardando eventos do sistema…</div>'
      : data.logs.map(renderLogLine).join('');

  const mlLines =
    data.mlScrapeLogs.length === 0
      ? '<div class="ml-scrape-empty">Nenhuma visita ao Mercado Livre ainda…</div>'
      : data.mlScrapeLogs.map(renderMlScrapeLine).join('');

  const transportLabel = data.redisEnabled ? 'REDIS + API' : 'API LOCAL';

  const body = `
    <div class="logs-layout">
      <aside class="ml-scrape-console">
        <div class="ml-scrape-header">
          <h2 class="ml-scrape-title">LOG MERCADO LIVRE</h2>
          <span class="ml-scrape-count-badge" id="audit-ml-scrape-count">${data.mlScrapeCount} visitas</span>
        </div>
        <div class="ml-scrape-output-wrap" id="ml-scrape-output-wrap">
          <div class="ml-scrape-output" id="ml-scrape-output">${mlLines}</div>
        </div>
        <div class="ml-scrape-footer">
          <span id="ml-scrape-footer-count">${data.mlScrapeLogs.length} no buffer</span>
          <span>cada acesso ao site</span>
        </div>
      </aside>

      <section class="audit-console">
        <div class="audit-header">
          <div class="audit-title-wrap">
            <h2 class="audit-title">CONSOLE DE AUDITORIA</h2>
            <span class="audit-live" id="audit-live-badge">
              <span class="audit-live-dot"></span>
              <span class="audit-live-text">AO VIVO</span>
            </span>
          </div>
          <div class="audit-toolbar">
            <label class="audit-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
              <input type="search" id="audit-search-input" placeholder="Filtrar eventos…" autocomplete="off">
            </label>
            <button type="button" class="audit-btn" id="audit-pause-btn">Pausar</button>
            <button type="button" class="audit-btn audit-btn-danger" id="audit-clear-btn">Limpar</button>
          </div>
        </div>

        <div class="audit-filters">
          <div class="audit-levels" id="audit-level-chips">
            <span class="audit-levels-label">NÍVEIS</span>
            <button type="button" class="audit-chip audit-chip-info active" data-levels="info">INFO</button>
            <button type="button" class="audit-chip audit-chip-ok active" data-levels="debug">OK</button>
            <button type="button" class="audit-chip audit-chip-warn active" data-levels="warn">WARN</button>
            <button type="button" class="audit-chip audit-chip-error active" data-levels="error,fatal">ERROR</button>
            <button type="button" class="audit-chip audit-chip-sec active" data-levels="trace">SEC</button>
          </div>
          <label class="audit-scroll-toggle">
            <input type="checkbox" id="audit-auto-scroll" checked>
            Rolagem automática
          </label>
        </div>

        <div class="audit-output-wrap" id="audit-output-wrap">
          <div class="audit-output" id="audit-output">${lines}<span class="audit-cursor" aria-hidden="true"></span></div>
        </div>

        <div class="audit-footer">
          <span id="audit-footer-count">A MOSTRAR ${data.logs.length} DE ${data.total} EVENTOS</span>
          <span>${escapeHtml(transportLabel)}</span>
        </div>
      </section>
    </div>

    <div id="log-meta-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="log-meta-modal-title">
        <div class="modal-header">
          <h3 id="log-meta-modal-title">Detalhes do evento</h3>
        </div>
        <div class="modal-body">
          <pre id="log-meta-content"></pre>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn modal-cancel" data-modal="log-meta-modal">Fechar</button>
        </div>
      </div>
    </div>

    ${pageData('logs-page-data', {
      lastTimestamp: data.logs.at(-1)?.timestamp ?? '',
      lastMlTimestamp: data.mlScrapeLogs.at(-1)?.timestamp ?? '',
      total: data.total,
      mlScrapeCount: data.mlScrapeCount,
      mlScrapeVisible: data.mlScrapeLogs.length,
      transportLabel,
    })}
    ${pageScripts('shared/modal.js', 'logs.js')}`;

  return renderLayout('Log', body, 'logs', pageStyles('logs.css'));
}
