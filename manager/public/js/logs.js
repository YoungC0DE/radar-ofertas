(function () {
  const pageData = JSON.parse(document.getElementById('logs-page-data')?.textContent || '{}');
  const { openModal, closeModal } = window.RadarModal;
  const LEVEL_CHIP_MAP = { info: 'INFO', debug: 'OK', trace: 'SEC', warn: 'WARN', error: 'ERROR', fatal: 'ERROR' };
  function levelChipClass(level) {
    const chip = LEVEL_CHIP_MAP[level] || 'INFO';
    return 'audit-chip-' + chip.toLowerCase();
  }

      const auditOutput = document.getElementById('audit-output');
      const auditOutputWrap = document.getElementById('audit-output-wrap');
      const auditFooterCount = document.getElementById('audit-footer-count');
      const auditMlScrapeCount = document.getElementById('audit-ml-scrape-count');
      const mlScrapeOutput = document.getElementById('ml-scrape-output');
      const mlScrapeOutputWrap = document.getElementById('ml-scrape-output-wrap');
      const mlScrapeFooterCount = document.getElementById('ml-scrape-footer-count');
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

      let lastTimestamp = pageData.lastTimestamp || "";
      let lastMlTimestamp = pageData.lastMlTimestamp || "";
      let refreshTimer = null;
      let isPaused = false;
      let totalEvents = pageData.total || 0;
      let mlScrapeCount = pageData.mlScrapeCount || 0;
      let mlScrapeVisible = pageData.mlScrapeVisible || 0;
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

      function renderLine(entry) {
        const metaEncoded = encodeURIComponent(JSON.stringify(entry.meta || {}, null, 2));
        return '<div class="audit-line audit-level-' + entry.level + '" data-level="' + entry.level + '" data-source="' + entry.source + '" data-search="' + escapeHtml(entry.searchBlob) + '" data-meta="' + metaEncoded + '">' +
          '<span class="audit-ts">' + formatLogTime(entry.timestamp) + '</span>' +
          '<span class="audit-level ' + entry.chipClass + '">[' + entry.chip + ']</span>' +
          '<span class="audit-source">' + escapeHtml(entry.source) + '</span>' +
          '<span class="audit-sep">›</span>' +
          '<span class="audit-module">' + escapeHtml(entry.module) + '</span>' +
          '<span class="audit-action">' + escapeHtml(entry.action) + '</span>' +
          '<span class="audit-msg">' + escapeHtml(entry.message) + '</span>' +
          (entry.metaTrail ? '<span class="audit-meta">' + escapeHtml(entry.metaTrail) + '</span>' : '') +
        '</div>';
      }

      function updateFooterCount() {
        const visible = auditOutput.querySelectorAll('.audit-line:not(.hidden)').length;
        auditFooterCount.textContent = 'A MOSTRAR ' + visible + ' DE ' + totalEvents + ' EVENTOS';
      }

      function updateMlScrapeCount() {
        if (auditMlScrapeCount) {
          auditMlScrapeCount.textContent = mlScrapeCount + ' visitas';
        }
        if (mlScrapeFooterCount) {
          mlScrapeFooterCount.textContent = mlScrapeVisible + ' no buffer';
        }
      }

      function renderMlScrapeLine(entry) {
        const metaEncoded = encodeURIComponent(JSON.stringify(entry.meta || {}, null, 2));
        return '<div class="ml-scrape-line ' + entry.statusClass + '" data-meta="' + metaEncoded + '" title="' + escapeHtml(entry.detail) + '">' +
          '<span class="ml-scrape-ts">' + formatLogTime(entry.timestamp) + '</span>' +
          '<span class="ml-scrape-status">' + entry.status + '</span>' +
          '<span class="ml-scrape-method">' + escapeHtml(entry.method) + '</span>' +
          '<span class="ml-scrape-detail">' + escapeHtml(entry.detail) + '</span>' +
        '</div>';
      }

      function bindMlScrapeLineClicks() {
        mlScrapeOutput.querySelectorAll('.ml-scrape-line').forEach((line) => {
          line.addEventListener('click', () => {
            const encoded = line.getAttribute('data-meta') || '%7B%7D';
            metaContent.textContent = decodeURIComponent(encoded);
            openModal(metaModal);
          });
        });
      }

      function insertMlScrapeLines(entries) {
        if (entries.length === 0) return;
        const html = entries.map(renderMlScrapeLine).join('');
        const empty = mlScrapeOutput.querySelector('.ml-scrape-empty');
        if (empty) empty.remove();
        mlScrapeOutput.insertAdjacentHTML('beforeend', html);
        mlScrapeVisible += entries.length;
        bindMlScrapeLineClicks();
        if (auditAutoScroll.checked && mlScrapeOutputWrap) {
          mlScrapeOutputWrap.scrollTop = mlScrapeOutputWrap.scrollHeight;
        }
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
        if (lastMlTimestamp) params.set('mlSince', lastMlTimestamp);

        const response = await fetch('/manager/api/logs?' + params.toString());
        if (!response.ok) return;
        const payload = await response.json();
        const logs = payload.logs ?? [];
        const mlLogs = payload.mlScrapeLogs ?? [];
        totalEvents = payload.total ?? totalEvents;
        mlScrapeCount = payload.mlScrapeCount ?? mlScrapeCount;
        updateMlScrapeCount();

        if (mlLogs.length > 0) {
          insertMlScrapeLines(mlLogs);
          lastMlTimestamp = mlLogs[mlLogs.length - 1].timestamp;
          const maxMlRows = 200;
          const mlLines = mlScrapeOutput.querySelectorAll('.ml-scrape-line');
          while (mlLines.length > maxMlRows && mlLines[0]) {
            mlLines[0].remove();
            mlScrapeVisible = Math.max(0, mlScrapeVisible - 1);
          }
          updateMlScrapeCount();
        }

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
      bindMlScrapeLineClicks();
      applyFilters();
      scrollToBottom();
      scheduleRefresh();
    
})();