(function () {
  function createPoller(fetchState, intervalMs) {
    let timer = null;

    return {
      start() {
        if (timer) return;
        timer = setInterval(() => void fetchState(), intervalMs);
      },
      stop() {
        if (!timer) return;
        clearInterval(timer);
        timer = null;
      },
      async tick() {
        await fetchState();
      },
    };
  }

  function workerBadgeHtml(status) {
    if (status === 'running') return '<span class="badge ok">Rodando</span>';
    if (status === 'starting') return '<span class="badge warn">Iniciando…</span>';
    if (status === 'error') return '<span class="badge err">Erro</span>';
    return '<span class="badge warn">Parado</span>';
  }

  function setupWorkerCard(prefix, channel) {
    const startBtn = document.getElementById(`${prefix}-start`);
    const restartBtn = document.getElementById(`${prefix}-restart`);
    const stopBtn = document.getElementById(`${prefix}-stop`);
    const badge = document.getElementById(`${prefix}-badge`);
    const detail = document.getElementById(`${prefix}-detail`);
    if (!startBtn || !badge || !detail) return;

    const query = channel ? `?channel=${channel}` : '';
    const poller = createPoller(poll, 2500);

    function render(state) {
      const running = state.status === 'running' || state.status === 'starting';
      badge.innerHTML = workerBadgeHtml(state.status);
      detail.textContent =
        state.detail ?? (running ? 'Processo de envio em execução' : 'Processo de envio parado');
      startBtn.disabled = running;
      if (stopBtn) stopBtn.disabled = !running;
    }

    async function poll() {
      try {
        const res = await fetch(`/manager/settings/worker/status${query}`);
        if (res.ok) render(await res.json());
      } catch (_) {}
    }

    async function action(endpoint, pending) {
      [startBtn, restartBtn, stopBtn].forEach((btn) => {
        if (btn) btn.disabled = true;
      });
      detail.textContent = pending;
      try {
        const res = await fetch(`${endpoint}${query}`, { method: 'POST' });
        if (res.ok) render(await res.json());
      } catch (_) {}
      poller.start();
      setTimeout(poll, 600);
    }

    startBtn.addEventListener('click', () => action('/manager/settings/worker/start', 'Iniciando worker…'));
    restartBtn?.addEventListener('click', () => action('/manager/settings/worker/restart', 'Reiniciando worker…'));
    stopBtn?.addEventListener('click', () => action('/manager/settings/worker/stop', 'Parando worker…'));
    poller.start();
  }

  function setupStatusFlow({ startButtonId, modalId, startUrl, statusUrl, renderState, onOpen, onClose, intervalMs = 1500 }) {
    const button = document.getElementById(startButtonId);
    const modal = document.getElementById(modalId);
    if (!button || !modal) return;

    const poller = createPoller(poll, intervalMs);
    const { openModal, closeModal } = window.RadarModal;

    async function poll() {
      try {
        const res = await fetch(statusUrl);
        if (res.ok) renderState(await res.json());
      } catch (_) {}
    }

    button.addEventListener('click', async () => {
      onOpen?.();
      openModal(modal);
      try {
        const res = await fetch(startUrl, { method: 'POST' });
        if (res.ok) renderState(await res.json());
      } catch (_) {}
      poller.stop();
      poller.start();
    });

    const close = () => {
      poller.stop();
      onClose?.();
      closeModal(modal);
    };

    modal.querySelector('[data-flow-close]')?.addEventListener('click', close);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) close();
    });

    return { poller, poll, close };
  }

  window.RadarPolling = { createPoller, setupWorkerCard, setupStatusFlow, workerBadgeHtml };
})();
