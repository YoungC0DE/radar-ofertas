(function () {
  const overlay = document.getElementById('confirm-modal');
  const titleEl = document.getElementById('confirm-modal-title');
  const messageEl = document.getElementById('confirm-modal-message');
  const cancelBtn = document.getElementById('confirm-modal-cancel');
  const okBtn = document.getElementById('confirm-modal-ok');
  let resolver = null;

  function closeModal(result) {
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (resolver) {
      resolver(result);
      resolver = null;
    }
  }

  cancelBtn?.addEventListener('click', () => closeModal(false));
  okBtn?.addEventListener('click', () => closeModal(true));
  overlay?.addEventListener('click', (event) => {
    if (event.target === overlay) closeModal(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && overlay && !overlay.classList.contains('hidden')) closeModal(false);
  });

  window.radarConfirm = function radarConfirm(options) {
    cancelBtn.style.display = '';
    titleEl.textContent = options.title || 'Confirmar';
    messageEl.textContent = options.message || '';
    okBtn.textContent = options.confirmLabel || 'Confirmar';
    okBtn.className = options.danger ? 'btn danger' : 'btn primary';
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    okBtn.focus();
    return new Promise((resolve) => {
      resolver = resolve;
    });
  };

  window.radarAlert = function radarAlert(options) {
    cancelBtn.style.display = 'none';
    titleEl.textContent = options.title || 'Atenção';
    messageEl.textContent = options.message || '';
    okBtn.textContent = options.okLabel || 'OK';
    okBtn.className = options.danger ? 'btn danger' : 'btn primary';
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    okBtn.focus();
    return new Promise((resolve) => {
      resolver = (result) => resolve(result !== false);
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.alert.err').forEach((el) => {
      const message = el.textContent?.trim();
      if (!message) return;
      el.classList.add('sr-only');
      window.radarAlert({ title: 'Erro', message, danger: true });
    });
  });
})();
