(function () {
  const pageData = JSON.parse(document.getElementById('settings-page-data')?.textContent || '{}');
  const brandInitial = pageData.brandInitial || 'R';
  const brandLogoData = pageData.brandLogoHref || '';
  const { openModal, closeModal, bindModalDismiss } = window.RadarModal;

      const linkInput = document.getElementById('channel-invite-link');
      const channelModal = document.getElementById('channel-link-modal');
      const couponsUrlModal = document.getElementById('coupons-url-modal');
      const operatingHoursModal = document.getElementById('operating-hours-modal');
      const intervalModal = document.getElementById('send-interval-modal');
      const senderDelayModal = document.getElementById('sender-delay-modal');
      const scoreModal = document.getElementById('score-modal');
      const brandModal = document.getElementById('brand-modal');
      const modalInviteInput = document.getElementById('modal-invite-link');
      const modalIntervalInput = document.getElementById('modal-interval-minutes');
      const modalBrandName = document.getElementById('modal-brand-name');
      const modalBrandSubtitle = document.getElementById('modal-brand-subtitle');
      const modalBrandMark = document.getElementById('modal-brand-mark');
      const modalBrandNamePreview = document.getElementById('modal-brand-name-preview');
      const modalBrandSubPreview = document.getElementById('modal-brand-sub-preview');
      const modalBrandLogoFile = document.getElementById('modal-brand-logo-file');
      const modalBrandLogoData = document.getElementById('modal-brand-logo-data');
      const modalRemoveLogo = document.getElementById('modal-remove-logo');
      const copyBtn = document.getElementById('copy-channel-link');
      const copyFeedback = document.getElementById('copy-channel-feedback');
            
      

      document.getElementById('edit-coupons-url')?.addEventListener('click', () => {
        openModal(couponsUrlModal);
      });

      document.getElementById('edit-channel-link')?.addEventListener('click', () => {
        modalInviteInput.value = linkInput?.value || '';
        openModal(channelModal);
      });

      document.getElementById('edit-operating-hours')?.addEventListener('click', () => {
        openModal(operatingHoursModal);
      });

      document.getElementById('edit-send-interval')?.addEventListener('click', () => {
        openModal(intervalModal);
      });

      document.getElementById('edit-sender-delay')?.addEventListener('click', () => {
        openModal(senderDelayModal);
      });

      document.getElementById('edit-score')?.addEventListener('click', () => {
        openModal(scoreModal);
      });

      document.getElementById('edit-brand')?.addEventListener('click', () => {
        modalBrandLogoData.value = brandLogoData;
        modalBrandLogoFile.value = '';
        if (modalRemoveLogo) modalRemoveLogo.checked = false;
        updateBrandPreview();
        openModal(brandModal);
      });

      function updateBrandPreview() {
        const name = modalBrandName?.value?.trim() || 'R';
        const subtitle = modalBrandSubtitle?.value?.trim() || '';
        modalBrandNamePreview.textContent = name;
        modalBrandSubPreview.textContent = subtitle;

        const logoData = modalBrandLogoData?.value?.trim();
        const removeLogo = modalRemoveLogo?.checked;

        if (removeLogo) {
          modalBrandMark.innerHTML = name.charAt(0).toUpperCase();
          return;
        }
        if (logoData) {
          modalBrandMark.innerHTML = '<img src="' + logoData + '" alt="">';
          return;
        }
        if (brandLogoData && !removeLogo) {
          modalBrandMark.innerHTML = '<img src="' + brandLogoData + '" alt="">';
          return;
        }
        modalBrandMark.innerHTML = name.charAt(0).toUpperCase() || brandInitial;
      }

      modalBrandName?.addEventListener('input', updateBrandPreview);
      modalBrandSubtitle?.addEventListener('input', updateBrandPreview);
      modalRemoveLogo?.addEventListener('change', updateBrandPreview);

      modalBrandLogoFile?.addEventListener('change', () => {
        const file = modalBrandLogoFile.files?.[0];
        if (!file) return;
        if (modalRemoveLogo) modalRemoveLogo.checked = false;
        const reader = new FileReader();
        reader.onload = () => {
          modalBrandLogoData.value = typeof reader.result === 'string' ? reader.result : '';
          updateBrandPreview();
        };
        reader.readAsDataURL(file);
      });

      document.querySelectorAll('.modal-cancel').forEach((btn) => {
        btn.addEventListener('click', () => {
          const modal = document.getElementById(btn.getAttribute('data-modal'));
          if (modal) closeModal(modal);
        });
      });

      [channelModal, couponsUrlModal, operatingHoursModal, intervalModal, senderDelayModal, scoreModal, brandModal].forEach((modal) => {
        modal?.addEventListener('click', (e) => {
          if (e.target === modal) closeModal(modal);
        });
      });

      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        [channelModal, couponsUrlModal, operatingHoursModal, intervalModal, senderDelayModal, scoreModal, brandModal].forEach((modal) => {
          if (!modal.classList.contains('hidden')) closeModal(modal);
        });
      });

      copyBtn?.addEventListener('click', async () => {
        const link = linkInput?.value?.trim();
        if (!link) return;

        try {
          await navigator.clipboard.writeText(link);
        } catch {
          const tmp = document.createElement('textarea');
          tmp.value = link;
          document.body.appendChild(tmp);
          tmp.select();
          document.execCommand('copy');
          document.body.removeChild(tmp);
        }

        copyFeedback?.classList.remove('hidden');
        setTimeout(() => copyFeedback?.classList.add('hidden'), 2000);
      });

      // --- Conectar com: Mercado Livre ---
      const mlConnectBtn = document.getElementById('connect-ml');
      const mlModal = document.getElementById('ml-connect-modal');
      const mlStatusEl = document.getElementById('ml-connect-status');
      const mlErrorEl = document.getElementById('ml-connect-error');
      const mlFinishBtn = document.getElementById('ml-connect-finish');
      const mlCancelBtn = document.getElementById('ml-connect-cancel');
      let mlPollTimer = null;

      function stopMlPoll() {
        if (mlPollTimer) { clearInterval(mlPollTimer); mlPollTimer = null; }
      }

      function renderMlState(state) {
        mlErrorEl.classList.add('hidden');
        if (state.error) {
          mlErrorEl.textContent = state.error;
          mlErrorEl.classList.remove('hidden');
        }
        switch (state.status) {
          case 'opening':
            mlStatusEl.textContent = 'Abrindo o navegador…';
            mlFinishBtn.disabled = true;
            break;
          case 'awaiting-login':
            mlStatusEl.textContent = 'Navegador aberto. Faça login e clique em Concluir.';
            mlFinishBtn.disabled = false;
            break;
          case 'saving':
            mlStatusEl.textContent = 'Salvando sessão…';
            mlFinishBtn.disabled = true;
            break;
          case 'connected':
            mlStatusEl.textContent = 'Sessão do Mercado Livre salva com sucesso! ✅';
            mlFinishBtn.disabled = true;
            stopMlPoll();
            setTimeout(() => location.reload(), 1200);
            break;
          case 'error':
            mlStatusEl.textContent = 'Não foi possível conectar.';
            mlFinishBtn.disabled = true;
            stopMlPoll();
            break;
        }
      }

      async function pollMl() {
        try {
          const res = await fetch('/manager/settings/connect/ml/status');
          if (res.ok) renderMlState(await res.json());
        } catch (_) {}
      }

      async function cancelMl() {
        stopMlPoll();
        closeModal(mlModal);
        try { await fetch('/manager/settings/connect/ml/cancel', { method: 'POST' }); } catch (_) {}
      }

      mlConnectBtn?.addEventListener('click', async () => {
        openModal(mlModal);
        mlStatusEl.textContent = 'Abrindo o navegador…';
        mlErrorEl.classList.add('hidden');
        mlFinishBtn.disabled = true;
        try {
          const res = await fetch('/manager/settings/connect/ml/start', { method: 'POST' });
          if (res.ok) renderMlState(await res.json());
        } catch (_) {}
        stopMlPoll();
        mlPollTimer = setInterval(pollMl, 1500);
      });

      mlFinishBtn?.addEventListener('click', async () => {
        mlStatusEl.textContent = 'Salvando sessão…';
        mlFinishBtn.disabled = true;
        try {
          const res = await fetch('/manager/settings/connect/ml/finish', { method: 'POST' });
          if (res.ok) renderMlState(await res.json());
        } catch (_) {}
      });

      mlCancelBtn?.addEventListener('click', cancelMl);
      mlModal?.addEventListener('click', (e) => { if (e.target === mlModal) cancelMl(); });

      // --- Conectar com: WhatsApp ---
      const waConnectBtn = document.getElementById('connect-wa');
      const waModal = document.getElementById('wa-connect-modal');
      const waStatusEl = document.getElementById('wa-connect-status');
      const waErrorEl = document.getElementById('wa-connect-error');
      const waQrWrap = document.getElementById('wa-qr-wrap');
      const waQrImg = document.getElementById('wa-qr-img');
      const waCloseBtn = document.getElementById('wa-connect-close');
      let waPollTimer = null;
      let waLastQr = '';

      function stopWaPoll() {
        if (waPollTimer) { clearInterval(waPollTimer); waPollTimer = null; }
      }

      function renderWaState(state) {
        waErrorEl.classList.add('hidden');
        switch (state.status) {
          case 'connecting':
            waStatusEl.textContent = 'Iniciando conexão…';
            waQrWrap.classList.add('hidden');
            break;
          case 'qr':
            waStatusEl.textContent = 'Escaneie o QR code com o WhatsApp:';
            if (state.qr && state.qr !== waLastQr) {
              waLastQr = state.qr;
              waQrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=' + encodeURIComponent(state.qr);
            }
            waQrWrap.classList.remove('hidden');
            break;
          case 'connected':
            waStatusEl.textContent = 'WhatsApp conectado com sucesso! ✅';
            waQrWrap.classList.add('hidden');
            stopWaPoll();
            setTimeout(() => location.reload(), 1200);
            break;
          case 'error':
            waStatusEl.textContent = 'Não foi possível conectar.';
            waQrWrap.classList.add('hidden');
            if (state.error) {
              waErrorEl.textContent = state.error;
              waErrorEl.classList.remove('hidden');
            }
            stopWaPoll();
            break;
        }
      }

      async function pollWa() {
        try {
          const res = await fetch('/manager/settings/connect/wa/status');
          if (res.ok) renderWaState(await res.json());
        } catch (_) {}
      }

      waConnectBtn?.addEventListener('click', async () => {
        openModal(waModal);
        waStatusEl.textContent = 'Iniciando conexão…';
        waErrorEl.classList.add('hidden');
        waQrWrap.classList.add('hidden');
        waLastQr = '';
        try {
          const res = await fetch('/manager/settings/connect/wa/start', { method: 'POST' });
          if (res.ok) renderWaState(await res.json());
        } catch (_) {}
        stopWaPoll();
        waPollTimer = setInterval(pollWa, 1500);
      });

      waCloseBtn?.addEventListener('click', () => { stopWaPoll(); closeModal(waModal); });
      waModal?.addEventListener('click', (e) => { if (e.target === waModal) { stopWaPoll(); closeModal(waModal); } });

      // --- Conectar com: Telegram (só reverifica; config é do .env) ---
      const tgConnectBtn = document.getElementById('connect-telegram');
      const tgConnectBadge = document.getElementById('telegram-connect-badge');
      const tgConnectDetail = document.getElementById('telegram-connect-detail');

      tgConnectBtn?.addEventListener('click', async () => {
        tgConnectBtn.disabled = true;
        tgConnectDetail.textContent = 'Verificando conexão com o Telegram…';
        try {
          const res = await fetch('/manager/settings/connect/telegram/status');
          if (res.ok) {
            const state = await res.json();
            tgConnectBadge.innerHTML = state.ok
              ? '<span class="badge ok">Conectado</span>'
              : '<span class="badge warn">Desconectado</span>';
            tgConnectDetail.textContent = state.detail;
          } else {
            tgConnectDetail.textContent = 'Não foi possível verificar agora.';
          }
        } catch (_) {
          tgConnectDetail.textContent = 'Não foi possível verificar agora.';
        }
        tgConnectBtn.disabled = false;
      });

      // --- Operações: Workers de envio (um card por canal) ---
            // Cada canal tem seu card, seus botões e seu polling — o ?channel= diz ao
      // painel qual processo controlar. O card do Telegram só existe quando o
      // canal está ligado, então saímos fora se os elementos não estiverem lá.
      RadarPolling.setupWorkerCard('worker', 'whatsapp');
      RadarPolling.setupWorkerCard('worker-tg', 'telegram');

      // --- Operações: Prisma generate ---
      const prismaBtn = document.getElementById('prisma-generate');
      const prismaModal = document.getElementById('prisma-modal');
      const prismaStatusEl = document.getElementById('prisma-status');
      const prismaOutputEl = document.getElementById('prisma-output');
      const prismaErrorEl = document.getElementById('prisma-error');
      const prismaCloseBtn = document.getElementById('prisma-close');
      let prismaPollTimer = null;

      function stopPrismaPoll() {
        if (prismaPollTimer) { clearInterval(prismaPollTimer); prismaPollTimer = null; }
      }

      function renderPrismaState(state) {
        prismaErrorEl.classList.add('hidden');
        prismaOutputEl.textContent = state.output || '';
        switch (state.status) {
          case 'running':
            prismaStatusEl.textContent = 'Executando prisma generate…';
            break;
          case 'done':
            prismaStatusEl.textContent = 'Prisma Client gerado com sucesso! ✅';
            stopPrismaPoll();
            break;
          case 'error':
            prismaStatusEl.textContent = 'Falha ao gerar o Prisma Client.';
            if (state.error) { prismaErrorEl.textContent = state.error; prismaErrorEl.classList.remove('hidden'); }
            stopPrismaPoll();
            break;
          default:
            prismaStatusEl.textContent = 'Pronto para executar.';
        }
      }

      async function pollPrisma() {
        try {
          const res = await fetch('/manager/settings/prisma/status');
          if (res.ok) renderPrismaState(await res.json());
        } catch (_) {}
      }

      prismaBtn?.addEventListener('click', async () => {
        openModal(prismaModal);
        prismaStatusEl.textContent = 'Executando prisma generate…';
        prismaOutputEl.textContent = '';
        prismaErrorEl.classList.add('hidden');
        try {
          const res = await fetch('/manager/settings/prisma/generate', { method: 'POST' });
          if (res.ok) renderPrismaState(await res.json());
        } catch (_) {}
        stopPrismaPoll();
        prismaPollTimer = setInterval(pollPrisma, 1200);
      });

      prismaCloseBtn?.addEventListener('click', () => { stopPrismaPoll(); closeModal(prismaModal); });
      prismaModal?.addEventListener('click', (e) => { if (e.target === prismaModal) { stopPrismaPoll(); closeModal(prismaModal); } });
    
})();