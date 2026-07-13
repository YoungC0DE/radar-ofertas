import type { TemplatePageData } from '../models/template-model.js';
import { getPlaceholderHelp } from '../models/template-model.js';
import { escapeHtml } from './helpers.js';
import { renderLayout } from './layout.js';

function placeholderChips(visibility: TemplatePageData['placeholderVisibility']): string {
  return getPlaceholderHelp()
    .filter((p) => visibility[p.key])
    .map(
      (p) =>
        `<button type="button" class="chip" data-placeholder="{{${p.key}}}" title="${escapeHtml(p.label)}">{{${p.key}}}</button>`,
    )
    .join('\n');
}

function placeholderTable(visibility: TemplatePageData['placeholderVisibility']): string {
  return getPlaceholderHelp()
    .map((p) => {
      const checked = visibility[p.key] ? ' checked' : '';
      return `<tr>
          <td>
            <label class="placeholder-flag">
              <input type="checkbox" name="placeholder_${p.key}" value="1" data-placeholder-key="${p.key}" class="placeholder-toggle"${checked}>
              <span>${visibility[p.key] ? 'Ativo' : 'Off'}</span>
            </label>
          </td>
          <td><code>{{${escapeHtml(p.key)}}}</code></td>
          <td>${escapeHtml(p.label)}</td>
          <td class="meta">${escapeHtml(p.example)}</td>
        </tr>`;
    })
    .join('');
}

export function renderTemplatePage(data: TemplatePageData): string {
  const alert = data.saved
    ? '<p class="alert ok">Template salvo com sucesso. Novas mensagens do bot usarão este texto.</p>'
    : data.error
      ? `<p class="alert err">${escapeHtml(data.error)}</p>`
      : '';

  const offerNote = data.previewOffer
    ? `<p class="meta">Preview com a oferta mais recente: <strong>${escapeHtml(data.previewOffer.title.slice(0, 50))}${data.previewOffer.title.length > 50 ? '…' : ''}</strong></p>`
    : '<p class="meta">Nenhuma oferta salva ainda — preview usa dados de exemplo.</p>';

  const body = `
    <style>
      .placeholder-flag {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 600;
      }
      .placeholder-flag input {
        width: 16px;
        height: 16px;
        cursor: pointer;
      }
      .placeholder-flag span {
        min-width: 40px;
        color: var(--text-muted);
      }
      .placeholder-flag:has(input:checked) span {
        color: #166534;
      }
      .chip-row:empty::before {
        content: 'Nenhum placeholder ativo — ative flags abaixo.';
        color: var(--text-muted);
        font-size: 0.85rem;
      }
      .placeholders-section {
        margin-top: 28px;
      }
    </style>
    ${alert}
    <section>
      <h2>Mensagem do bot</h2>
      <p class="meta">
        Edite o texto livremente. Use os placeholders — o bot substitui automaticamente na hora do envio.
        Placeholders desativados não aparecem na mensagem final.
      </p>

      <form method="post" action="/manager/template" class="template-form">
        <div class="editor-grid">
          <div class="editor-panel">
            <label for="template">Texto da mensagem</label>
            <div class="chip-row" id="placeholder-chips">${placeholderChips(data.placeholderVisibility)}</div>
            <textarea id="template" name="template" rows="14" spellcheck="false">${escapeHtml(data.template)}</textarea>
            <div class="form-actions">
              <button type="submit" class="btn primary">Salvar template</button>
              <button type="button" class="btn" id="reset-template">Restaurar padrão</button>
            </div>
          </div>

          <div class="preview-panel">
            <label>Preview (como vai no WhatsApp)</label>
            <pre id="preview" class="preview-box">${escapeHtml(data.previewText)}</pre>
            ${offerNote}
          </div>
        </div>

        <section class="placeholders-section">
          <h2>Placeholders disponíveis</h2>
          <p class="meta">Ative ou desative cada flag. Com a flag off, o placeholder some do texto enviado (linhas vazias são removidas).</p>
          <table>
            <thead><tr><th>Flag</th><th>Código</th><th>Significado</th><th>Exemplo</th></tr></thead>
            <tbody>${placeholderTable(data.placeholderVisibility)}</tbody>
          </table>
        </section>
      </form>
    </section>

    <script>
      const textarea = document.getElementById('template');
      const preview = document.getElementById('preview');
      const chipRow = document.getElementById('placeholder-chips');
      const previewValues = ${JSON.stringify(data.previewValues)};
      const defaultTemplate = ${JSON.stringify(data.defaultTemplate)};
      const placeholderMeta = ${JSON.stringify(getPlaceholderHelp())};

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
          .split('\\n')
          .filter((line) => /[A-Za-z0-9À-ÿ$]/.test(line))
          .join('\\n')
          .trim();
      }

      function renderPreview(text) {
        const visibility = getVisibility();
        let result = text;
        for (const [key, value] of Object.entries(previewValues)) {
          const pattern = new RegExp('\\\\{\\\\{\\\\s*' + key + '\\\\s*\\\\}\\\\}', 'g');
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

      document.getElementById('reset-template').addEventListener('click', () => {
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
    </script>`;

  return renderLayout('Mensagem', body, 'template');
}
