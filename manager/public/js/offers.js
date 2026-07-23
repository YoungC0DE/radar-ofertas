(function () {
  const pageData = JSON.parse(document.getElementById('offers-page-data')?.textContent || '{}');
  const affiliateDelayModal = document.getElementById('affiliate-delay-modal');
  const { openModal, closeModal, bindModalDismiss } = window.RadarModal || {};

  document.getElementById('edit-affiliate-delay-btn')?.addEventListener('click', () => {
    openModal?.(affiliateDelayModal);
  });

  if (affiliateDelayModal && bindModalDismiss) {
    bindModalDismiss(affiliateDelayModal, () => closeModal?.(affiliateDelayModal));
  }

  document.addEventListener('keydown', (event) => {
    if (
      event.key === 'Escape' &&
      affiliateDelayModal &&
      !affiliateDelayModal.classList.contains('hidden')
    ) {
      closeModal?.(affiliateDelayModal);
    }
  });

  if (pageData.pendingCount > 0) {
    document.getElementById('delete-pending-btn')?.addEventListener('click', () => {
      radarConfirm({
        title: 'Remover ofertas pendentes',
        message: `Remover todas as ${pageData.pendingCount} ofertas pendentes? Elas não serão enviadas ao WhatsApp.`,
        confirmLabel: 'Remover',
        danger: true,
      }).then((ok) => {
        if (ok) document.getElementById('delete-pending-form')?.submit();
      });
    });
  }
})();
