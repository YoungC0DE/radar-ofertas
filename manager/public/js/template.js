(function () {
  const pageData = JSON.parse(document.getElementById('template-page-data')?.textContent || '{}');
  const previewValues = pageData.previewValues || {};
  const defaultTemplate = pageData.defaultTemplate || '';
  const placeholderMeta = pageData.placeholderMeta || [];
  const couponPreviewValues = pageData.couponPreviewValues || {};
  const couponPlaceholderMeta = pageData.couponPlaceholderMeta || [];
  const defaultCouponTemplate = pageData.couponDefaultTemplate || '';

  const textarea = document.getElementById('template');
  const preview = document.getElementById('preview');
  const chipRow = document.getElementById('placeholder-chips');

  function getVisibility() {
    const visibility = {};
    document.querySelectorAll('.placeholder-toggle').forEach((input) => {
      const key = input.getAttribute('data-placeholder-key');
      visibility[key] = input.checked;
      const label = input.closest('.placeholder-flag')?.querySelector('span');
      if (label) label.textContent = input.checked ? 'Ativo' : 'Off';
    });
    return visibility;
  }

  function cleanupRenderedMessage(text) {
    return text
      .split('\n')
      .filter((line) => /[A-Za-z0-9À-ÿ$]/.test(line))
      .join('\n')
      .trim();
  }

  function renderPreview(text) {
    const visibility = getVisibility();
    let result = text;
    for (const [key, value] of Object.entries(previewValues)) {
      const pattern = new RegExp('\\{\\{\\s*' + key + '\\s*\\}\\}', 'g');
      result = result.replace(pattern, visibility[key] ? value : '');
    }
    result = cleanupRenderedMessage(result);
    preview.textContent = result || '(vazio)';
  }

  function renderChips() {
    const visibility = getVisibility();
    chipRow.innerHTML = placeholderMeta
      .filter((p) => visibility[p.key])
      .map(
        (p) =>
          '<button type="button" class="chip" data-placeholder="{{' +
          p.key +
          '}}" title="' +
          p.label +
          '">{{' +
          p.key +
          '}}</button>',
      )
      .join('');
    chipRow.querySelectorAll('.chip').forEach((btn) => {
      btn.addEventListener('click', () => insertPlaceholder(btn.getAttribute('data-placeholder')));
    });
  }

  function insertPlaceholder(token) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.value = textarea.value.slice(0, start) + token + textarea.value.slice(end);
    const pos = start + token.length;
    textarea.setSelectionRange(pos, pos);
    textarea.focus();
    renderPreview(textarea.value);
  }

  if (textarea && preview && chipRow) {
    textarea.addEventListener('input', () => renderPreview(textarea.value));

    document.querySelectorAll('.placeholder-toggle').forEach((input) => {
      input.addEventListener('change', () => {
        renderChips();
        renderPreview(textarea.value);
      });
    });

    chipRow.querySelectorAll('.chip').forEach((btn) => {
      btn.addEventListener('click', () => insertPlaceholder(btn.getAttribute('data-placeholder')));
    });

    const resetBtn = document.getElementById('reset-template');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        radarConfirm({
          title: 'Restaurar padrão',
          message: 'Restaurar o texto padrão? Isso não salva até você clicar em Salvar.',
          confirmLabel: 'Restaurar',
        }).then((ok) => {
          if (!ok) return;
          textarea.value = defaultTemplate;
          renderPreview(textarea.value);
        });
      });
    }
  }

  function bindScheduleRadios() {
    document.querySelectorAll('[data-auto-message-card]').forEach((card) => {
      const radios = card.querySelectorAll('input[type="radio"][name="scheduleType"]');
      const onceInput = card.querySelector('.schedule-once-input');
      const dailyInput = card.querySelector('.schedule-daily-input');

      function sync() {
        const selected = card.querySelector('input[type="radio"][name="scheduleType"]:checked');
        const type = selected?.value ?? 'manual';
        if (onceInput) onceInput.disabled = type !== 'once';
        if (dailyInput) dailyInput.disabled = type !== 'daily';
      }

      radios.forEach((radio) => radio.addEventListener('change', sync));
      sync();
    });
  }

  document.querySelectorAll('[data-confirm-delete]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      const form = btn.closest('form');
      radarConfirm({
        title: 'Excluir mensagem',
        message: 'Excluir esta mensagem automática?',
        confirmLabel: 'Excluir',
      }).then((ok) => {
        if (ok && form) form.submit();
      });
    });
  });

  bindScheduleRadios();

  const couponTextarea = document.getElementById('coupon-template');
  const couponPreview = document.getElementById('coupon-preview');
  const couponChipRow = document.getElementById('coupon-placeholder-chips');

  function getCouponVisibility() {
    const visibility = {};
    document.querySelectorAll('.coupon-placeholder-toggle').forEach((input) => {
      const key = input.getAttribute('data-coupon-placeholder-key');
      visibility[key] = input.checked;
      const label = input.closest('.placeholder-flag')?.querySelector('span');
      if (label) label.textContent = input.checked ? 'Ativo' : 'Off';
    });
    return visibility;
  }

  function renderCouponPreview(text) {
    const visibility = getCouponVisibility();
    let result = text;
    for (const [key, value] of Object.entries(couponPreviewValues)) {
      const pattern = new RegExp('\\{\\{\\s*' + key + '\\s*\\}\\}', 'g');
      result = result.replace(pattern, visibility[key] ? value : '');
    }
    result = cleanupRenderedMessage(result);
    couponPreview.textContent = result || '(vazio)';
  }

  function renderCouponChips() {
    const visibility = getCouponVisibility();
    couponChipRow.innerHTML = couponPlaceholderMeta
      .filter((p) => visibility[p.key])
      .map(
        (p) =>
          '<button type="button" class="chip" data-placeholder="{{' +
          p.key +
          '}}" title="' +
          p.label +
          '">{{' +
          p.key +
          '}}</button>',
      )
      .join('');
    couponChipRow.querySelectorAll('.chip').forEach((btn) => {
      btn.addEventListener('click', () => insertCouponPlaceholder(btn.getAttribute('data-placeholder')));
    });
  }

  function insertCouponPlaceholder(token) {
    const start = couponTextarea.selectionStart;
    const end = couponTextarea.selectionEnd;
    couponTextarea.value = couponTextarea.value.slice(0, start) + token + couponTextarea.value.slice(end);
    const pos = start + token.length;
    couponTextarea.setSelectionRange(pos, pos);
    couponTextarea.focus();
    renderCouponPreview(couponTextarea.value);
  }

  if (couponTextarea && couponPreview && couponChipRow) {
    couponTextarea.addEventListener('input', () => renderCouponPreview(couponTextarea.value));

    document.querySelectorAll('.coupon-placeholder-toggle').forEach((input) => {
      input.addEventListener('change', () => {
        renderCouponChips();
        renderCouponPreview(couponTextarea.value);
      });
    });

    couponChipRow.querySelectorAll('.chip').forEach((btn) => {
      btn.addEventListener('click', () => insertCouponPlaceholder(btn.getAttribute('data-placeholder')));
    });

    const resetCouponBtn = document.getElementById('reset-coupon-template');
    if (resetCouponBtn) {
      resetCouponBtn.addEventListener('click', () => {
        radarConfirm({
          title: 'Restaurar padrão',
          message: 'Restaurar o texto padrão de cupom? Isso não salva até você clicar em Salvar.',
          confirmLabel: 'Restaurar',
        }).then((ok) => {
          if (!ok) return;
          couponTextarea.value = defaultCouponTemplate;
          renderCouponPreview(couponTextarea.value);
        });
      });
    }
  }
})();
