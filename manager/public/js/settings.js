(function () {
  const pageData = JSON.parse(document.getElementById('settings-page-data')?.textContent || '{}');
  const brandInitial = pageData.brandInitial || 'R';
  const brandLogoData = pageData.brandLogoHref || '';
  const canSpawnWorkers = pageData.canSpawnWorkers !== false;
  const radarModal = window.RadarModal;
  if (!radarModal) {
    console.error('[settings] shared/modal.js não carregou — recarregue a página com Ctrl+F5');
    return;
  }
  const { openModal, closeModal } = radarModal;

  function activateTabGroup(group, tabId) {
    group.querySelectorAll('[role="tab"]').forEach((button) => {
      const active = button.dataset.tab === tabId;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    group.querySelectorAll('[role="tabpanel"]').forEach((panel) => {
      const active = panel.id === `tab-panel-${tabId}`;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
    });
  }

  function setupTabGroup(group) {
    const isSub = group.classList.contains('settings-tabs-sub');
    group.querySelectorAll('[role="tab"]').forEach((button) => {
      button.addEventListener('click', () => {
        const tabId = button.dataset.tab;
        if (!tabId) return;
        activateTabGroup(group, tabId);
        if (!isSub) {
          history.replaceState(null, '', `#${tabId}`);
        }
      });
    });
  }

  document.querySelectorAll('.settings-tabs').forEach(setupTabGroup);

  const hashTab = location.hash.replace(/^#/, '');
  const mainGroup = document.querySelector('.settings-tabs:not(.settings-tabs-sub)');
  if (hashTab && mainGroup) {
    const hashButton = mainGroup.querySelector(`[role="tab"][data-tab="${hashTab}"]`);
    if (hashButton) {
      activateTabGroup(mainGroup, hashTab);
    }
  } else if (pageData.activeTab && mainGroup) {
    activateTabGroup(mainGroup, pageData.activeTab);
    history.replaceState(null, '', `#${pageData.activeTab}`);
  }

  const affiliateGroup = document.querySelector('.settings-tabs-sub');
  if (pageData.affiliateSubTab && affiliateGroup) {
    activateTabGroup(affiliateGroup, pageData.affiliateSubTab);
  }

  window.addEventListener('hashchange', () => {
    const tabId = location.hash.replace(/^#/, '');
    if (!tabId) return;
    const mainGroup = document.querySelector('.settings-tabs:not(.settings-tabs-sub)');
    const hashButton = mainGroup?.querySelector(`[role="tab"][data-tab="${tabId}"]`);
    if (hashButton) {
      activateTabGroup(mainGroup, tabId);
    }
  });

  const couponsUrlModal = document.getElementById('coupons-url-modal');
      const amazonAffiliateModal = document.getElementById('amazon-affiliate-modal');
      const operatingHoursModal = document.getElementById('operating-hours-modal');
      const intervalModal = document.getElementById('send-interval-modal');
      const senderDelayModal = document.getElementById('sender-delay-modal');
      const scoreModal = document.getElementById('score-modal');
      const brandModal = document.getElementById('brand-modal');
      const modalBrandName = document.getElementById('modal-brand-name');
      const modalBrandSubtitle = document.getElementById('modal-brand-subtitle');
      const modalBrandMark = document.getElementById('modal-brand-mark');
      const modalBrandNamePreview = document.getElementById('modal-brand-name-preview');
      const modalBrandSubPreview = document.getElementById('modal-brand-sub-preview');
      const modalBrandLogoFile = document.getElementById('modal-brand-logo-file');
      const modalBrandLogoData = document.getElementById('modal-brand-logo-data');
      const modalRemoveLogo = document.getElementById('modal-remove-logo');
            
      

      document.getElementById('edit-coupons-url')?.addEventListener('click', () => {
        openModal(couponsUrlModal);
      });

      document.getElementById('edit-amazon-affiliate')?.addEventListener('click', () => {
        openModal(amazonAffiliateModal);
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

      [couponsUrlModal, amazonAffiliateModal, operatingHoursModal, intervalModal, senderDelayModal, scoreModal, brandModal].forEach((modal) => {
        modal?.addEventListener('click', (e) => {
          if (e.target === modal) closeModal(modal);
        });
      });

      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        [couponsUrlModal, amazonAffiliateModal, operatingHoursModal, intervalModal, senderDelayModal, scoreModal, brandModal].forEach((modal) => {
          if (!modal.classList.contains('hidden')) closeModal(modal);
        });
      });

      // --- Operações: Workers de envio (um card por conta habilitada) ---
      document.querySelectorAll('[data-worker-setup]').forEach((el) => {
        RadarPolling.setupWorkerCard(
          el.dataset.workerPrefix,
          el.dataset.workerChannel,
          canSpawnWorkers,
          el.dataset.workerAccount,
        );
      });

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