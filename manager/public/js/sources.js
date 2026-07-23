(function () {
  const modal = document.getElementById('ml-source-modal');
  const { openModal, closeModal, bindModalDismiss } = window.RadarModal || {};

  document.getElementById('add-ml-source')?.addEventListener('click', () => {
    openModal?.(modal);
  });

  if (modal && bindModalDismiss) {
    bindModalDismiss(modal, () => closeModal?.(modal));
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
      closeModal?.(modal);
    }
  });
})();
