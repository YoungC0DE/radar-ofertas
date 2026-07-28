import { useMemo, useRef, useState } from 'react';

import type { PlaceholderMeta } from '../../constants/template-placeholders.js';
import {
  insertPlaceholder,
  renderTemplatePreview,
} from '../../utils/template-preview.js';
import { Button } from '../ui/Button.js';
import { Checkbox } from '../ui/Checkbox.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../ui/Table.js';

type MessageTemplateEditorProps = {
  editorId: string;
  template: string;
  defaultTemplate: string;
  previewValues: Record<string, string>;
  placeholderMeta: readonly PlaceholderMeta[];
  placeholderVisibility: Record<string, boolean>;
  previewNote: string;
  saveLabel: string;
  onSave: (template: string, visibility: Record<string, boolean>) => Promise<void>;
};

export function MessageTemplateEditor({
  editorId,
  template: initialTemplate,
  defaultTemplate,
  previewValues,
  placeholderMeta,
  placeholderVisibility: initialVisibility,
  previewNote,
  saveLabel,
  onSave,
}: MessageTemplateEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [template, setTemplate] = useState(initialTemplate);
  const [visibility, setVisibility] = useState(initialVisibility);
  const [saving, setSaving] = useState(false);

  const previewText = useMemo(
    () => renderTemplatePreview(template, previewValues, visibility),
    [template, previewValues, visibility],
  );

  const activePlaceholders = placeholderMeta.filter((item) => visibility[item.key]);

  function handleToggle(key: string, enabled: boolean) {
    setVisibility((current) => ({ ...current, [key]: enabled }));
  }

  function handleChipClick(token: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { next, cursor } = insertPlaceholder(
      template,
      token,
      textarea.selectionStart,
      textarea.selectionEnd,
    );
    setTemplate(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  async function handleReset() {
    const ok = window.confirm(
      'Restaurar o texto padrão? Isso não salva até você clicar em Salvar.',
    );
    if (!ok) return;
    setTemplate(defaultTemplate);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(template, visibility);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div>
          <label htmlFor={editorId} className="mb-2 block text-sm font-semibold text-text-primary">
            Texto da mensagem
          </label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {activePlaceholders.length === 0 ? (
              <span className="text-sm text-text-secondary">
                Nenhum placeholder ativo — ative flags abaixo.
              </span>
            ) : (
              activePlaceholders.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="cursor-pointer rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-xs text-primary transition-colors hover:bg-primary/15"
                  title={item.label}
                  onClick={() => handleChipClick(`{{${item.key}}}`)}
                >
                  {`{{${item.key}}}`}
                </button>
              ))
            )}
          </div>
          <textarea
            ref={textareaRef}
            id={editorId}
            rows={14}
            spellCheck={false}
            value={template}
            onChange={(event) => setTemplate(event.target.value)}
            className="min-h-[280px] w-full resize-y rounded-[10px] border border-border bg-bg-secondary px-3 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-secondary/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Salvando…' : saveLabel}
            </Button>
            <Button variant="secondary" onClick={() => void handleReset()} disabled={saving}>
              Restaurar padrão
            </Button>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-text-primary">
            Preview (como vai no WhatsApp)
          </label>
          <pre className="m-0 min-h-[280px] whitespace-pre-wrap break-words rounded-xl border border-border bg-bg-secondary p-3.5 text-sm text-text-primary">
            {previewText}
          </pre>
          <p className="mt-2 text-sm text-text-secondary">{previewNote}</p>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold text-text-primary">Placeholders disponíveis</h3>
        <p className="text-sm text-text-secondary">
          Ative ou desative cada flag. Com a flag off, o placeholder some do texto enviado (linhas
          vazias são removidas).
        </p>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Flag</TableHeaderCell>
              <TableHeaderCell>Código</TableHeaderCell>
              <TableHeaderCell>Significado</TableHeaderCell>
              <TableHeaderCell>Exemplo</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {placeholderMeta.map((item) => (
              <TableRow key={item.key}>
                <TableCell>
                  <Checkbox
                    label={
                      <span className={visibility[item.key] ? 'text-primary' : 'text-text-secondary'}>
                        {visibility[item.key] ? 'Ativo' : 'Off'}
                      </span>
                    }
                    labelClassName="font-semibold"
                    checked={visibility[item.key] ?? false}
                    onChange={(event) => handleToggle(item.key, event.target.checked)}
                  />
                </TableCell>
                <TableCell>
                  <code className="rounded bg-bg-secondary px-1.5 py-0.5 font-mono text-[0.82rem]">
                    {`{{${item.key}}}`}
                  </code>
                </TableCell>
                <TableCell>{item.label}</TableCell>
                <TableCell className="text-sm text-text-secondary">{item.example}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
