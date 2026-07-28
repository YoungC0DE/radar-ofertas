import { useMemo, useState } from 'react';

import type { SerializedAutoMessage } from '../../types/api.js';
import {
  autoMessageToFormState,
  describeFormSchedule,
  formStateToAutoMessageBody,
  renderAutoMessagePreview,
  type AutoMessageFormState,
} from '../../utils/auto-message.js';
import { formatDate } from '../../utils/format.js';
import { Badge } from '../ui/Badge.js';
import { Button } from '../ui/Button.js';
import { Checkbox } from '../ui/Checkbox.js';
import { Input } from '../ui/Input.js';

const fieldInputClass =
  'h-10 w-full rounded-[10px] border border-border bg-bg-secondary px-3 text-sm text-text-primary transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25';

const textareaClass =
  'min-h-[140px] w-full resize-y rounded-[10px] border border-border bg-bg-secondary px-3 py-2.5 text-sm text-text-primary transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25';

type AutoMessageCardProps = {
  message: SerializedAutoMessage;
  onSave: (id: string, body: ReturnType<typeof formStateToAutoMessageBody>) => Promise<void>;
  onSend: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  busy: boolean;
};

function ScheduleFields({
  state,
  onChange,
  groupId,
}: {
  state: AutoMessageFormState;
  onChange: (patch: Partial<AutoMessageFormState>) => void;
  groupId: string;
}) {
  return (
    <fieldset className="rounded-xl border border-border bg-bg-secondary/30 p-4">
      <legend className="px-1 text-sm font-semibold text-text-primary">Agendamento</legend>
      <div className="mt-3 flex flex-col gap-3">
        <label className="flex cursor-pointer flex-col gap-1 rounded-lg border border-border/60 bg-bg-card p-3">
          <span className="flex items-center gap-2 text-sm font-medium">
            <input
              type="radio"
              name={`schedule-${groupId}`}
              checked={state.scheduleType === 'manual'}
              onChange={() => onChange({ scheduleType: 'manual' })}
            />
            Sem agendamento
          </span>
          <small className="pl-6 text-xs text-text-secondary">
            Salva a mensagem — envie manualmente com o botão abaixo
          </small>
        </label>
        <label className="flex cursor-pointer flex-col gap-2 rounded-lg border border-border/60 bg-bg-card p-3">
          <span className="flex items-center gap-2 text-sm font-medium">
            <input
              type="radio"
              name={`schedule-${groupId}`}
              checked={state.scheduleType === 'once'}
              onChange={() => onChange({ scheduleType: 'once' })}
            />
            Enviar uma vez em
          </span>
          <input
            type="datetime-local"
            className={fieldInputClass}
            value={state.scheduledAt}
            disabled={state.scheduleType !== 'once'}
            onChange={(event) => onChange({ scheduledAt: event.target.value })}
          />
        </label>
        <label className="flex cursor-pointer flex-col gap-2 rounded-lg border border-border/60 bg-bg-card p-3">
          <span className="flex items-center gap-2 text-sm font-medium">
            <input
              type="radio"
              name={`schedule-${groupId}`}
              checked={state.scheduleType === 'daily'}
              onChange={() => onChange({ scheduleType: 'daily' })}
            />
            Repetir todo dia às
          </span>
          <input
            type="time"
            className={fieldInputClass}
            value={state.dailyTime}
            disabled={state.scheduleType !== 'daily'}
            onChange={(event) => onChange({ dailyTime: event.target.value })}
          />
        </label>
      </div>
    </fieldset>
  );
}

export function AutoMessageCard({ message, onSave, onSend, onDelete, busy }: AutoMessageCardProps) {
  const [state, setState] = useState(() => autoMessageToFormState(message));

  const preview = useMemo(() => renderAutoMessagePreview(state.content), [state.content]);
  const scheduleLabel = describeFormSchedule(state);

  function patch(partial: Partial<AutoMessageFormState>) {
    setState((current) => ({ ...current, ...partial }));
  }

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border bg-bg-card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          className={`${fieldInputClass} max-w-md font-medium`}
          placeholder="Título (ex: Bom dia)"
          value={state.title}
          onChange={(event) => patch({ title: event.target.value })}
        />
        <Badge tone="info">{scheduleLabel}</Badge>
      </div>

      <label className="text-sm font-medium text-text-secondary">Texto da mensagem</label>
      <textarea
        rows={6}
        spellCheck={false}
        className={textareaClass}
        value={state.content}
        onChange={(event) => patch({ content: event.target.value })}
      />

      <div className="flex flex-col gap-2">
        <pre className="m-0 whitespace-pre-wrap break-words rounded-xl border border-border bg-bg-secondary p-3.5 text-sm">
          {preview}
        </pre>
        {message.lastSentAt ? (
          <p className="text-sm text-text-secondary">Último envio: {formatDate(message.lastSentAt)}</p>
        ) : null}
      </div>

      <ScheduleFields state={state} onChange={patch} groupId={message.id} />

      <Checkbox
        label="Agendamento ativo"
        checked={state.enabled}
        onChange={(event) => patch({ enabled: event.target.checked })}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={busy}
          onClick={() => void onSave(message.id, formStateToAutoMessageBody(state))}
        >
          Salvar e programar
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button variant="secondary" disabled={busy} onClick={() => void onSend(message.id)}>
          Enviar agora
        </Button>
        <Button
          variant="danger"
          disabled={busy}
          onClick={() => {
            if (!window.confirm('Excluir esta mensagem automática?')) return;
            void onDelete(message.id);
          }}
        >
          Excluir
        </Button>
      </div>
    </article>
  );
}

type NewAutoMessageCardProps = {
  onCreate: (body: ReturnType<typeof formStateToAutoMessageBody>) => Promise<void>;
  busy: boolean;
};

export function NewAutoMessageCard({ onCreate, busy }: NewAutoMessageCardProps) {
  const [state, setState] = useState<AutoMessageFormState>({
    title: '',
    content: '',
    scheduleType: 'manual',
    scheduledAt: '',
    dailyTime: '08:00',
    enabled: true,
  });

  function patch(partial: Partial<AutoMessageFormState>) {
    setState((current) => ({ ...current, ...partial }));
  }

  return (
    <article className="mt-4 flex flex-col gap-4 rounded-2xl border border-dashed border-border bg-bg-card/50 p-5">
      <h3 className="text-base font-semibold text-text-primary">Nova mensagem</h3>
      <Input
        label="Título"
        placeholder="Ex: Bom dia"
        value={state.title}
        onChange={(event) => patch({ title: event.target.value })}
        required
      />
      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-medium text-text-secondary">Texto</label>
        <textarea
          rows={6}
          placeholder="Bom dia! ☀️ Confira as ofertas de hoje no {{brand}}."
          className={textareaClass}
          value={state.content}
          onChange={(event) => patch({ content: event.target.value })}
          required
        />
      </div>
      <ScheduleFields state={state} onChange={patch} groupId="new" />
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => void onCreate(formStateToAutoMessageBody(state))}>
          Salvar e programar
        </Button>
      </div>
    </article>
  );
}
