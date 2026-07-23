(function () {
  function openModal(modal) {
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    modal.querySelector('input, button, textarea, select')?.focus();
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    if (document.querySelectorAll('.modal-overlay:not(.hidden)').length === 0) {
      document.body.style.overflow = '';
    }
  }

  function bindModalDismiss(modal, onClose) {
    modal?.querySelectorAll('.modal-cancel').forEach((btn) => {
      btn.addEventListener('click', () => {
        onClose?.();
        closeModal(modal);
      });
    });
    modal?.addEventListener('click', (event) => {
      if (event.target === modal) {
        onClose?.();
        closeModal(modal);
      }
    });
  }

  window.RadarModal = { openModal, closeModal, bindModalDismiss };
})();
