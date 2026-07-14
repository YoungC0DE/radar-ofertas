import type { LogsPageData } from '../models/logs-model.js';
import type { LogEntry } from '../../src/utils/log-store.js';
import { escapeHtml } from './helpers.js';
import { renderLayout } from './layout.js';

const LEVEL_CHIP_MAP: Record<string, string> = {
  info: 'INFO',
  debug: 'OK',
  trace: 'SEC',
  warn: 'WARN',
  error: 'ERROR',
  fatal: 'ERROR',
};

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

function inferModule(entry: LogEntry): string {
  const meta = entry.meta;
  if (typeof meta.jobId === 'string') return 'jobs.collector';
  if (typeof meta.offerId === 'string') return 'offers.service';
  if (typeof meta.permalink === 'string' || typeof meta.endpoint === 'string') return 'mercado-livre.affiliate';
  if (typeof meta.category === 'string') return 'mercado-livre.scraper';
  if (typeof meta.channelId === 'string') return 'whatsapp.channel';
  if (typeof meta.path === 'string') return 'manager.http';
  if (entry.source === 'worker') return 'jobs.sender';
  if (entry.source === 'manager') return 'manager.app';
  if (entry.source === 'collector') return 'jobs.collector';
  return 'app.runtime';
}

function inferAction(entry: LogEntry): string {
  const msg = entry.message.toLowerCase();
  if (msg.includes('failed') || msg.includes('error') || msg.includes('expired')) return 'FAIL';
  if (msg.includes('completed') || msg.includes('generated') || msg.includes('saved')) return 'OK';
  if (msg.includes('starting') || msg.includes('collection')) return 'RUN';
  if (msg.includes('delay') || msg.includes('skipping')) return 'WAIT';
  if (msg.includes('enqueue') || msg.includes('enqueued')) return 'POST';
  return 'LOG';
}

function formatMetaTrail(meta: Record<string, unknown>): string {
  const keys = Object.keys(meta);
  if (keys.length === 0) return '';

  return keys
    .slice(0, 4)
    .map((key) => {
      const value = meta[key];
      const rendered =
        typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : JSON.stringify(value);
      const trimmed = rendered.length > 56 ? `${rendered.slice(0, 56)}…` : rendered;
      return `${key}=${trimmed}`;
    })
    .join(' ');
}

function levelChipClass(level: string): string {
  const chip = LEVEL_CHIP_MAP[level] ?? 'INFO';
  return `audit-chip-${chip.toLowerCase()}`;
}

function renderLogLine(entry: LogEntry): string {
  const chip = LEVEL_CHIP_MAP[entry.level] ?? entry.level.toUpperCase();
  const module = inferModule(entry);
  const action = inferAction(entry);
  const metaTrail = formatMetaTrail(entry.meta);
  const metaEncoded = encodeURIComponent(JSON.stringify(entry.meta, null, 2));

  return `<div class="audit-line audit-level-${escapeHtml(entry.level)}" data-level="${escapeHtml(entry.level)}" data-source="${escapeHtml(entry.source)}" data-search="${escapeHtml(`${entry.message} ${module} ${metaTrail} ${entry.source}`.toLowerCase())}" data-meta="${metaEncoded}">
    <span class="audit-ts">${formatLogTime(entry.timestamp)}</span>
    <span class="audit-level ${levelChipClass(entry.level)}">[${chip}]</span>
    <span class="audit-source">${escapeHtml(entry.source)}</span>
    <span class="audit-sep">›</span>
    <span class="audit-module">${escapeHtml(module)}</span>
    <span class="audit-action">${escapeHtml(action)}</span>
    <span class="audit-msg">${escapeHtml(entry.message)}</span>
    ${metaTrail ? `<span class="audit-meta">${escapeHtml(metaTrail)}</span>` : ''}
  </div>`;
}

export function renderLogsPage(data: LogsPageData): string {
  const lines =
    data.logs.length === 0
      ? '<div class="audit-empty">Aguardando eventos do sistema…</div>'
      : data.logs.map(renderLogLine).join('');

  const transportLabel = data.redisEnabled ? 'REDIS + API' : 'API LOCAL';

  const body = `
    <style>
      .audit-console {
        --audit-bg: #0d1117;
        --audit-surface: #161b22;
        --audit-border: #30363d;
        --audit-text: #c9d1d9;
        --audit-muted: #8b949e;
        --audit-info: #58a6ff;
        --audit-ok: #3fb950;
        --audit-warn: #d29922;
        --audit-error: #f85149;
        --audit-sec: #bc8cff;
        background: var(--audit-surface);
        border: 1px solid var(--audit-border);
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 8px 24px rgba(1, 4, 9, 0.35);
      }
      .audit-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 14px 18px;
        border-bottom: 1px solid var(--audit-border);
        background: linear-gradient(180deg, #1c2128 0%, #161b22 100%);
        flex-wrap: wrap;
      }
      .audit-title-wrap {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 220px;
      }
      .audit-title {
        margin: 0;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        color: #f0f6fc;
      }
      .audit-live {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        background: rgba(63, 185, 80, 0.12);
        border: 1px solid rgba(63, 185, 80, 0.35);
        color: #3fb950;
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.08em;
      }
      .audit-live.paused {
        background: rgba(139, 148, 158, 0.12);
        border-color: rgba(139, 148, 158, 0.35);
        color: #8b949e;
      }
      .audit-live-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #3fb950;
        box-shadow: 0 0 8px rgba(63, 185, 80, 0.8);
      }
      .audit-live.paused .audit-live-dot {
        background: #8b949e;
        box-shadow: none;
      }
      .audit-toolbar {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
        justify-content: flex-end;
        flex-wrap: wrap;
      }
      .audit-search {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 220px;
        max-width: 360px;
        flex: 1;
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid var(--audit-border);
        background: var(--audit-bg);
        color: var(--audit-text);
      }
      .audit-search input {
        width: 100%;
        border: 0;
        outline: none;
        background: transparent;
        color: var(--audit-text);
        font-size: 0.82rem;
      }
      .audit-search svg {
        width: 15px;
        height: 15px;
        color: var(--audit-muted);
        flex-shrink: 0;
      }
      .audit-btn {
        border: 1px solid var(--audit-border);
        background: #21262d;
        color: #f0f6fc;
        border-radius: 8px;
        padding: 8px 14px;
        font-size: 0.78rem;
        font-weight: 600;
        cursor: pointer;
      }
      .audit-btn:hover { background: #30363d; }
      .audit-btn-danger {
        color: #ff7b72;
        border-color: rgba(248, 81, 73, 0.35);
      }
      .audit-filters {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 12px 18px;
        border-bottom: 1px solid var(--audit-border);
        background: #0d1117;
        flex-wrap: wrap;
      }
      .audit-levels {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .audit-levels-label {
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        color: var(--audit-muted);
        margin-right: 4px;
      }
      .audit-chip {
        border: 1px solid transparent;
        border-radius: 6px;
        padding: 5px 10px;
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        cursor: pointer;
        opacity: 0.45;
        transition: opacity 0.15s ease, transform 0.15s ease;
      }
      .audit-chip.active { opacity: 1; transform: translateY(-1px); }
      .audit-chip-info { background: rgba(88, 166, 255, 0.18); color: #58a6ff; border-color: rgba(88, 166, 255, 0.35); }
      .audit-chip-ok { background: rgba(63, 185, 80, 0.18); color: #3fb950; border-color: rgba(63, 185, 80, 0.35); }
      .audit-chip-warn { background: rgba(210, 153, 34, 0.18); color: #d29922; border-color: rgba(210, 153, 34, 0.35); }
      .audit-chip-error { background: rgba(248, 81, 73, 0.18); color: #f85149; border-color: rgba(248, 81, 73, 0.35); }
      .audit-chip-sec { background: rgba(188, 140, 255, 0.18); color: #bc8cff; border-color: rgba(188, 140, 255, 0.35); }
      .audit-scroll-toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--audit-muted);
        font-size: 0.72rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        user-select: none;
      }
      .audit-output-wrap {
        background: var(--audit-bg);
        min-height: 420px;
        max-height: calc(100vh - 280px);
        overflow: auto;
      }
      .audit-output {
        padding: 16px 18px 8px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
        font-size: 0.8rem;
        line-height: 1.65;
      }
      .audit-line {
        white-space: nowrap;
        margin-bottom: 2px;
      }
      .audit-line.hidden { display: none; }
      .audit-ts { color: #8b949e; margin-right: 10px; }
      .audit-level {
        display: inline-block;
        min-width: 58px;
        margin-right: 10px;
        font-weight: 700;
      }
      .audit-level.audit-chip-info { color: #58a6ff; }
      .audit-level.audit-chip-ok { color: #3fb950; }
      .audit-level.audit-chip-warn { color: #d29922; }
      .audit-level.audit-chip-error { color: #f85149; }
      .audit-level.audit-chip-sec { color: #bc8cff; }
      .audit-source { color: #3fb950; font-weight: 700; margin-right: 8px; }
      .audit-sep { color: #484f58; margin-right: 8px; }
      .audit-module { color: #79c0ff; margin-right: 10px; }
      .audit-action {
        display: inline-block;
        min-width: 42px;
        color: #f0f6fc;
        font-weight: 700;
        margin-right: 10px;
      }
      .audit-msg { color: #c9d1d9; margin-right: 12px; }
      .audit-meta { color: #6e7681; }
      .audit-line.audit-level-error .audit-msg,
      .audit-line.audit-level-fatal .audit-msg { color: #ffa198; }
      .audit-line.audit-level-warn .audit-msg { color: #e3b341; }
      .audit-cursor {
        display: inline-block;
        width: 9px;
        height: 1.1em;
        margin: 8px 0 16px 18px;
        background: #f0f6fc;
        animation: audit-blink 1s step-end infinite;
        vertical-align: bottom;
      }
      @keyframes audit-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
      .audit-empty {
        color: #8b949e;
        padding: 24px 0;
      }
      .audit-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 18px;
        border-top: 1px solid var(--audit-border);
        background: #161b22;
        color: var(--audit-muted);
        font-size: 0.72rem;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      #log-meta-modal .modal {
        background: #161b22;
        color: #c9d1d9;
        border: 1px solid #30363d;
      }
      #log-meta-modal .modal-header {
        border-bottom: 1px solid #30363d;
      }
      #log-meta-modal pre {
        margin: 0;
        padding: 14px;
        border-radius: 8px;
        background: #0d1117;
        color: #c9d1d9;
        overflow: auto;
        max-height: 420px;
        font-size: 0.8rem;
        border: 1px solid #30363d;
      }
    </style>

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

    <script>
      const auditOutput = document.getElementById('audit-output');
      const auditOutputWrap = document.getElementById('audit-output-wrap');
      const auditFooterCount = document.getElementById('audit-footer-count');
      const auditLiveBadge = document.getElementById('audit-live-badge');
      const auditLiveText = auditLiveBadge.querySelector('.audit-live-text');
      const auditPauseBtn = document.getElementById('audit-pause-btn');
      const auditClearBtn = document.getElementById('audit-clear-btn');
      const auditSearchInput = document.getElementById('audit-search-input');
      const auditAutoScroll = document.getElementById('audit-auto-scroll');
      const levelChips = document.getElementById('audit-level-chips');
      const metaModal = document.getElementById('log-meta-modal');
      const metaContent = document.getElementById('log-meta-content');
      const cursorNode = auditOutput.querySelector('.audit-cursor');

      let lastTimestamp = ${JSON.stringify(data.logs.at(-1)?.timestamp ?? '')};
      let refreshTimer = null;
      let isPaused = false;
      let totalEvents = ${data.total};
      const activeLevels = new Set(['info', 'debug', 'warn', 'error', 'fatal', 'trace']);

      function escapeHtml(value) {
        return String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      }

      function formatLogTime(timestamp) {
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

      const LEVEL_CHIP_MAP = { info: 'INFO', debug: 'OK', trace: 'SEC', warn: 'WARN', error: 'ERROR', fatal: 'ERROR' };

      function inferModule(entry) {
        const meta = entry.meta || {};
        if (typeof meta.jobId === 'string') return 'jobs.collector';
        if (typeof meta.offerId === 'string') return 'offers.service';
        if (typeof meta.permalink === 'string' || typeof meta.endpoint === 'string') return 'mercado-livre.affiliate';
        if (typeof meta.category === 'string') return 'mercado-livre.scraper';
        if (typeof meta.channelId === 'string') return 'whatsapp.channel';
        if (typeof meta.path === 'string') return 'manager.http';
        if (entry.source === 'worker') return 'jobs.sender';
        if (entry.source === 'manager') return 'manager.app';
        if (entry.source === 'collector') return 'jobs.collector';
        return 'app.runtime';
      }

      function inferAction(entry) {
        const msg = entry.message.toLowerCase();
        if (msg.includes('failed') || msg.includes('error') || msg.includes('expired')) return 'FAIL';
        if (msg.includes('completed') || msg.includes('generated') || msg.includes('saved')) return 'OK';
        if (msg.includes('starting') || msg.includes('collection')) return 'RUN';
        if (msg.includes('delay') || msg.includes('skipping')) return 'WAIT';
        if (msg.includes('enqueue') || msg.includes('enqueued')) return 'POST';
        return 'LOG';
      }

      function formatMetaTrail(meta) {
        const keys = Object.keys(meta || {});
        if (keys.length === 0) return '';
        return keys.slice(0, 4).map((key) => {
          const value = meta[key];
          const rendered = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
            ? String(value)
            : JSON.stringify(value);
          const trimmed = rendered.length > 56 ? rendered.slice(0, 56) + '…' : rendered;
          return key + '=' + trimmed;
        }).join(' ');
      }

      function levelChipClass(level) {
        const chip = LEVEL_CHIP_MAP[level] || 'INFO';
        return 'audit-chip-' + chip.toLowerCase();
      }

      function renderLine(entry) {
        const chip = LEVEL_CHIP_MAP[entry.level] || entry.level.toUpperCase();
        const module = inferModule(entry);
        const action = inferAction(entry);
        const metaTrail = formatMetaTrail(entry.meta);
        const metaEncoded = encodeURIComponent(JSON.stringify(entry.meta || {}, null, 2));
        const searchBlob = (entry.message + ' ' + module + ' ' + metaTrail + ' ' + entry.source).toLowerCase();

        return '<div class="audit-line audit-level-' + entry.level + '" data-level="' + entry.level + '" data-source="' + entry.source + '" data-search="' + escapeHtml(searchBlob) + '" data-meta="' + metaEncoded + '">' +
          '<span class="audit-ts">' + formatLogTime(entry.timestamp) + '</span>' +
          '<span class="audit-level ' + levelChipClass(entry.level) + '">[' + chip + ']</span>' +
          '<span class="audit-source">' + escapeHtml(entry.source) + '</span>' +
          '<span class="audit-sep">›</span>' +
          '<span class="audit-module">' + escapeHtml(module) + '</span>' +
          '<span class="audit-action">' + escapeHtml(action) + '</span>' +
          '<span class="audit-msg">' + escapeHtml(entry.message) + '</span>' +
          (metaTrail ? '<span class="audit-meta">' + escapeHtml(metaTrail) + '</span>' : '') +
        '</div>';
      }

      function updateFooterCount() {
        const visible = auditOutput.querySelectorAll('.audit-line:not(.hidden)').length;
        auditFooterCount.textContent = 'A MOSTRAR ' + visible + ' DE ' + totalEvents + ' EVENTOS';
      }

      function applyFilters() {
        const query = auditSearchInput.value.trim().toLowerCase();
        auditOutput.querySelectorAll('.audit-line').forEach((line) => {
          const level = line.getAttribute('data-level') || '';
          const search = line.getAttribute('data-search') || '';
          const levelOk = activeLevels.has(level);
          const searchOk = !query || search.includes(query);
          line.classList.toggle('hidden', !(levelOk && searchOk));
        });
        updateFooterCount();
      }

      function scrollToBottom() {
        if (!auditAutoScroll.checked) return;
        auditOutputWrap.scrollTop = auditOutputWrap.scrollHeight;
      }

      function bindLineClicks() {
        auditOutput.querySelectorAll('.audit-line').forEach((line) => {
          line.style.cursor = 'pointer';
          line.title = 'Clique para ver detalhes';
          line.addEventListener('click', () => {
            const encoded = line.getAttribute('data-meta') || '%7B%7D';
            metaContent.textContent = decodeURIComponent(encoded);
            openModal(metaModal);
          });
        });
      }

      function openModal(modal) {
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      }

      function closeModal(modal) {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        if (document.querySelectorAll('.modal-overlay:not(.hidden)').length === 0) {
          document.body.style.overflow = '';
        }
      }

      metaModal?.querySelector('.modal-cancel')?.addEventListener('click', () => closeModal(metaModal));
      metaModal?.addEventListener('click', (event) => {
        if (event.target === metaModal) closeModal(metaModal);
      });

      function insertLines(entries) {
        if (entries.length === 0) return;
        const html = entries.map(renderLine).join('');
        const empty = auditOutput.querySelector('.audit-empty');
        if (empty) empty.remove();
        cursorNode.insertAdjacentHTML('beforebegin', html);
        bindLineClicks();
        applyFilters();
        scrollToBottom();
      }

      async function refreshLogs() {
        if (isPaused) return;
        const params = new URLSearchParams({ level: 'all', source: 'all', limit: '1000' });
        if (lastTimestamp) params.set('since', lastTimestamp);

        const response = await fetch('/manager/api/logs?' + params.toString());
        if (!response.ok) return;
        const payload = await response.json();
        const logs = payload.logs ?? [];
        totalEvents = payload.total ?? totalEvents;

        if (logs.length > 0) {
          insertLines(logs);
          lastTimestamp = logs[logs.length - 1].timestamp;
          const maxRows = 1000;
          const lines = auditOutput.querySelectorAll('.audit-line');
          while (lines.length > maxRows && lines[0]) {
            lines[0].remove();
          }
        }

        updateFooterCount();
      }

      function setPaused(paused) {
        isPaused = paused;
        auditPauseBtn.textContent = paused ? 'Retomar' : 'Pausar';
        auditLiveBadge.classList.toggle('paused', paused);
        auditLiveText.textContent = paused ? 'PAUSADO' : 'AO VIVO';
        if (!paused) void refreshLogs();
        scheduleRefresh();
      }

      function scheduleRefresh() {
        if (refreshTimer) clearInterval(refreshTimer);
        if (isPaused) return;
        refreshTimer = setInterval(() => { void refreshLogs(); }, 3000);
      }

      levelChips.querySelectorAll('.audit-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          chip.classList.toggle('active');
          const levels = (chip.getAttribute('data-levels') || '').split(',');
          const isActive = chip.classList.contains('active');
          levels.forEach((level) => {
            if (isActive) activeLevels.add(level);
            else activeLevels.delete(level);
          });
          applyFilters();
        });
      });

      auditSearchInput.addEventListener('input', applyFilters);
      auditPauseBtn.addEventListener('click', () => setPaused(!isPaused));
      auditClearBtn.addEventListener('click', () => {
        auditOutput.querySelectorAll('.audit-line').forEach((line) => line.remove());
        if (!auditOutput.querySelector('.audit-empty')) {
          cursorNode.insertAdjacentHTML('beforebegin', '<div class="audit-empty">Console limpo. Novos eventos aparecerão aqui.</div>');
        }
        updateFooterCount();
      });

      bindLineClicks();
      applyFilters();
      scrollToBottom();
      scheduleRefresh();
    </script>`;

  return renderLayout('Log', body, 'logs');
}
