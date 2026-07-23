(function () {
  const copyBtn = document.getElementById('copy-affiliate-link');
  const feedback = document.getElementById('copy-affiliate-feedback');
  if (!copyBtn || !feedback) return;

  copyBtn.addEventListener('click', async () => {
    const url = copyBtn.getAttribute('data-url');
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      feedback.textContent = 'Copiado!';
      feedback.classList.remove('hidden');
      window.setTimeout(() => {
        feedback.classList.add('hidden');
      }, 2000);
    } catch {
      feedback.textContent = 'Não foi possível copiar';
      feedback.classList.remove('hidden');
    }
  });
})();
