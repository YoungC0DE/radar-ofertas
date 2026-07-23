(function () {
  const mlModal = document.getElementById('ml-source-modal');
  const amazonModal = document.getElementById('amazon-source-modal');
  const { openModal, closeModal, bindModalDismiss } = window.RadarModal || {};

  document.getElementById('add-ml-source')?.addEventListener('click', () => {
    openModal?.(mlModal);
  });

  document.getElementById('add-amazon-source')?.addEventListener('click', () => {
    openModal?.(amazonModal);
  });

  for (const modal of [mlModal, amazonModal]) {
    if (modal && bindModalDismiss) {
      bindModalDismiss(modal, () => closeModal?.(modal));
    }
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    for (const modal of [mlModal, amazonModal]) {
      if (modal && !modal.classList.contains('hidden')) {
        closeModal?.(modal);
      }
    }
  });
})();
