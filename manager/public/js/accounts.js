(function () {
  const pageData = JSON.parse(document.getElementById('accounts-page-data')?.textContent || '{}');
  const radarModal = window.RadarModal;
  if (!radarModal) {
    console.error('[accounts] shared/modal.js não carregou — recarregue a página com Ctrl+F5');
    return;
  }
  const { openModal, closeModal } = radarModal;

  function buildNovncUrl() {
    if (!pageData.novncEnabled) return null;
    const port = pageData.novncPort || 6080;
    const params = 'scale=true&path=websockify';
    return `http://${window.location.hostname}:${port}/vnc_lite.html?${params}`;
  }

  const novncUrl = buildNovncUrl();
  const mlNovncLink = document.getElementById('ml-novnc-link');
  if (mlNovncLink && novncUrl) {
    mlNovncLink.href = novncUrl;
  }

  document.querySelectorAll('.account-config-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const modalId = button.getAttribute('data-modal');
      const modal = modalId ? document.getElementById(modalId) : null;
      if (modal) openModal(modal);
    });
  });

  document.querySelectorAll('.modal-cancel').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modal = document.getElementById(btn.getAttribute('data-modal') ?? '');
      if (modal) closeModal(modal);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal(modal);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.modal-overlay').forEach((modal) => {
      if (!modal.classList.contains('hidden')) closeModal(modal);
    });
  });

  document.querySelectorAll('.account-enabled-input').forEach((input) => {
    const form = input.closest('.account-enabled-form');
    if (!form) return;
    const initial = input.checked;
    input.addEventListener('change', () => {
      if (input.disabled) {
        input.checked = initial;
        return;
      }
      form.submit();
    });
  });

  function postDestinationAction(action, fields) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = action;
    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  }

  document.addEventListener('click', (event) => {
    const removeBtn = event.target.closest('.destination-remove');
    if (removeBtn) {
      const accountId = removeBtn.getAttribute('data-account-id');
      const destinationId = removeBtn.getAttribute('data-destination-id');
      if (!accountId || !destinationId || !window.confirm('Remover este destino?')) return;
      postDestinationAction(`/manager/accounts/${accountId}/whatsapp-destinations/remove`, {
        destinationId,
      });
      return;
    }

    const toggleBtn = event.target.closest('.destination-toggle');
    if (toggleBtn) {
      const accountId = toggleBtn.getAttribute('data-account-id');
      const destinationId = toggleBtn.getAttribute('data-destination-id');
      const enabled = toggleBtn.getAttribute('data-enabled');
      if (!accountId || !destinationId || enabled == null) return;
      postDestinationAction(`/manager/accounts/${accountId}/whatsapp-destinations/toggle`, {
        destinationId,
        enabled,
      });
    }
  });

  const openConfigAccountId = pageData.openConfigAccountId;
  const openConfigPlatform = pageData.openConfigPlatform;
  if (openConfigAccountId) {
    const modalIdsByPlatform = {
      whatsapp: `wa-config-modal-${openConfigAccountId}`,
      telegram: `tg-config-modal-${openConfigAccountId}`,
      mercado_livre: `ml-config-modal-${openConfigAccountId}`,
    };
    const modalId = openConfigPlatform ? modalIdsByPlatform[openConfigPlatform] : null;
    const modal = modalId ? document.getElementById(modalId) : null;
    if (modal) openModal(modal);
  }

  // --- WhatsApp login ---
  const waLoginModal = document.getElementById('wa-login-modal');
  const waLoginStatus = document.getElementById('wa-login-status');
  const waLoginError = document.getElementById('wa-login-error');
  const waLoginQrWrap = document.getElementById('wa-login-qr-wrap');
  const waLoginQrImg = document.getElementById('wa-login-qr-img');
  const waLoginClose = document.getElementById('wa-login-close');
  let waPollTimer = null;
  let waLastQr = '';
  let activeWaAccountId = null;

  function stopWaPoll() {
    if (waPollTimer) {
      clearInterval(waPollTimer);
      waPollTimer = null;
    }
  }

  function renderWaLoginState(state) {
    waLoginError.classList.add('hidden');
    switch (state.status) {
      case 'connecting':
        waLoginStatus.textContent = 'Iniciando conexão…';
        waLoginQrWrap.classList.add('hidden');
        break;
      case 'qr':
        waLoginStatus.textContent = 'Escaneie o QR code com o WhatsApp:';
        if (state.qr && state.qr !== waLastQr) {
          waLastQr = state.qr;
          waLoginQrImg.src =
            'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=' +
            encodeURIComponent(state.qr);
        }
        waLoginQrWrap.classList.remove('hidden');
        break;
      case 'connected':
        waLoginStatus.textContent = 'WhatsApp conectado com sucesso!';
        waLoginQrWrap.classList.add('hidden');
        stopWaPoll();
        setTimeout(() => location.reload(), 1200);
        break;
      case 'error':
        waLoginStatus.textContent = 'Não foi possível conectar.';
        waLoginQrWrap.classList.add('hidden');
        if (state.error) {
          waLoginError.textContent = state.error;
          waLoginError.classList.remove('hidden');
        }
        stopWaPoll();
        break;
      default:
        waLoginStatus.textContent = 'Aguardando worker…';
        break;
    }
  }

  async function pollWaLogin() {
    if (!activeWaAccountId) return;
    try {
      const res = await fetch(
        `/manager/accounts/${encodeURIComponent(activeWaAccountId)}/connect/whatsapp/status`,
      );
      if (res.ok) renderWaLoginState(await res.json());
    } catch (_) {}
  }

  async function startWhatsAppLogin(accountId) {
    activeWaAccountId = accountId;
    openModal(waLoginModal);
    waLoginStatus.textContent = 'Iniciando conexão…';
    waLoginError.classList.add('hidden');
    waLoginQrWrap.classList.add('hidden');
    waLastQr = '';
    try {
      const res = await fetch(
        `/manager/accounts/${encodeURIComponent(accountId)}/connect/whatsapp/start`,
        { method: 'POST' },
      );
      if (res.ok) renderWaLoginState(await res.json());
    } catch (_) {}
    stopWaPoll();
    waPollTimer = setInterval(pollWaLogin, 1500);
  }

  waLoginClose?.addEventListener('click', () => {
    stopWaPoll();
    closeModal(waLoginModal);
  });
  waLoginModal?.addEventListener('click', (event) => {
    if (event.target === waLoginModal) {
      stopWaPoll();
      closeModal(waLoginModal);
    }
  });

  // --- Mercado Livre login ---
  const mlLoginModal = document.getElementById('ml-login-modal');
  const mlLoginStatus = document.getElementById('ml-login-status');
  const mlLoginError = document.getElementById('ml-login-error');
  const mlLoginFinish = document.getElementById('ml-login-finish');
  const mlLoginCancel = document.getElementById('ml-login-cancel');
  let mlPollTimer = null;
  let activeMlAccountId = null;

  function stopMlPoll() {
    if (mlPollTimer) {
      clearInterval(mlPollTimer);
      mlPollTimer = null;
    }
  }

  function renderMlLoginState(state) {
    mlLoginError.classList.add('hidden');
    if (state.error) {
      mlLoginError.textContent = state.error;
      mlLoginError.classList.remove('hidden');
    }
    switch (state.status) {
      case 'opening':
        mlLoginStatus.textContent = 'Abrindo o navegador…';
        mlLoginFinish.disabled = true;
        break;
      case 'awaiting-login':
        mlLoginStatus.textContent = novncUrl
          ? 'Navegador aberto no desktop do container — use o noVNC, faça login e clique em Concluir.'
          : 'Navegador aberto. Faça login e clique em Concluir.';
        mlLoginFinish.disabled = false;
        break;
      case 'saving':
        mlLoginStatus.textContent = 'Salvando sessão…';
        mlLoginFinish.disabled = true;
        break;
      case 'connected':
        mlLoginStatus.textContent = 'Sessão do Mercado Livre salva com sucesso!';
        mlLoginFinish.disabled = true;
        stopMlPoll();
        setTimeout(() => location.reload(), 1200);
        break;
      case 'error':
        mlLoginStatus.textContent = 'Não foi possível abrir o navegador.';
        mlLoginFinish.disabled = true;
        stopMlPoll();
        break;
      default:
        break;
    }
  }

  async function pollMlLogin() {
    if (!activeMlAccountId) return;
    try {
      const res = await fetch(
        `/manager/accounts/${encodeURIComponent(activeMlAccountId)}/connect/mercado-livre/status`,
      );
      if (res.ok) renderMlLoginState(await res.json());
    } catch (_) {}
  }

  async function cancelMlLogin() {
    stopMlPoll();
    closeModal(mlLoginModal);
    if (!activeMlAccountId) return;
    try {
      await fetch(
        `/manager/accounts/${encodeURIComponent(activeMlAccountId)}/connect/mercado-livre/cancel`,
        { method: 'POST' },
      );
    } catch (_) {}
  }

  async function startMercadoLivreLogin(accountId) {
    activeMlAccountId = accountId;
    openModal(mlLoginModal);
    mlLoginStatus.textContent = novncUrl
      ? 'Abra o noVNC em outra aba e aguarde o navegador…'
      : 'Abrindo o navegador…';
    mlLoginError.classList.add('hidden');
    mlLoginFinish.disabled = true;
    if (novncUrl) {
      window.open(novncUrl, '_blank', 'noopener');
    }
    try {
      const res = await fetch(
        `/manager/accounts/${encodeURIComponent(accountId)}/connect/mercado-livre/start`,
        { method: 'POST' },
      );
      if (res.ok) renderMlLoginState(await res.json());
    } catch (_) {}
    stopMlPoll();
    mlPollTimer = setInterval(pollMlLogin, 1500);
  }

  mlLoginFinish?.addEventListener('click', async () => {
    if (!activeMlAccountId) return;
    mlLoginStatus.textContent = 'Salvando sessão…';
    mlLoginFinish.disabled = true;
    try {
      const res = await fetch(
        `/manager/accounts/${encodeURIComponent(activeMlAccountId)}/connect/mercado-livre/finish`,
        { method: 'POST' },
      );
      if (res.ok) renderMlLoginState(await res.json());
    } catch (_) {}
  });

  mlLoginCancel?.addEventListener('click', cancelMlLogin);
  mlLoginModal?.addEventListener('click', (event) => {
    if (event.target === mlLoginModal) cancelMlLogin();
  });

  async function verifyTelegramLogin(accountId) {
    const configModal = document.getElementById(`tg-config-modal-${accountId}`);
    try {
      const res = await fetch(
        `/manager/accounts/${encodeURIComponent(accountId)}/connect/telegram/verify`,
        { method: 'POST' },
      );
      if (!res.ok) {
        window.alert('Não foi possível verificar o Telegram agora.');
        return;
      }
      const state = await res.json();
      if (state.ok) {
        location.reload();
        return;
      }
      window.alert(state.detail || 'Telegram não conectado.');
      if (configModal) openModal(configModal);
    } catch (_) {
      window.alert('Não foi possível verificar o Telegram agora.');
    }
  }

  document.querySelectorAll('.account-login-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const accountId = button.getAttribute('data-account-id');
      const platform = button.getAttribute('data-platform');
      if (!accountId || !platform) return;

      if (platform === 'whatsapp') {
        await startWhatsAppLogin(accountId);
        return;
      }

      if (platform === 'mercado_livre') {
        await startMercadoLivreLogin(accountId);
        return;
      }

      if (platform === 'telegram') {
        await verifyTelegramLogin(accountId);
      }
    });
  });
})();
