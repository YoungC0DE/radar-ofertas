(function () {
  document.querySelectorAll('.offer-delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      radarConfirm({
        title: 'Apagar oferta',
        message: 'Apagar esta oferta pendente? Ela não será enviada ao WhatsApp.',
        confirmLabel: 'Apagar',
        danger: true,
      }).then((ok) => {
        if (ok) btn.closest('form')?.submit();
      });
    });
  });
})();
