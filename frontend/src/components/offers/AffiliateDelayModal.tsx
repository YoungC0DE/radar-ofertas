import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import type { AffiliateDelaySettings } from '../../types/api.js';
import { Button } from '../ui/Button.js';
import { Input } from '../ui/Input.js';
import { Modal } from '../ui/Modal.js';

type AffiliateDelayModalProps = {
  open: boolean;
  settings: AffiliateDelaySettings;
  onClose: () => void;
  onSave: (settings: {
    affiliateDelayMs: number;
    affiliateBacklogDelayMinutes: number;
    affiliateBacklogThreshold: number;
  }) => Promise<void>;
};

const FORM_ID = 'affiliate-delay-form';

export function AffiliateDelayModal({ open, settings, onClose, onSave }: AffiliateDelayModalProps) {
  const [delayMs, setDelayMs] = useState(String(settings.delayMs));
  const [backlogThreshold, setBacklogThreshold] = useState(String(settings.backlogThreshold));
  const [backlogDelayMinutes, setBacklogDelayMinutes] = useState(
    String(settings.backlogDelayMinutes),
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDelayMs(String(settings.delayMs));
    setBacklogThreshold(String(settings.backlogThreshold));
    setBacklogDelayMinutes(String(settings.backlogDelayMinutes));
  }, [open, settings]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await onSave({
        affiliateDelayMs: Number.parseInt(delayMs, 10),
        affiliateBacklogDelayMinutes: Number.parseInt(backlogDelayMinutes, 10),
        affiliateBacklogThreshold: Number.parseInt(backlogThreshold, 10),
      });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Delay entre chamadas de afiliado"
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} disabled={loading}>
            {loading ? 'Salvando…' : 'Salvar'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <Input
          label="Delay normal (milissegundos)"
          type="number"
          value={delayMs}
          onChange={(event) => setDelayMs(event.target.value)}
          min={0}
          max={60000}
          step={100}
          required
        />
        <p className="text-xs text-text-secondary">
          Intervalo entre chamadas à API de link de afiliado quando o backlog está baixo (ex: 500 =
          meio segundo).
        </p>

        <Input
          label="Pendentes para desacelerar"
          type="number"
          value={backlogThreshold}
          onChange={(event) => setBacklogThreshold(event.target.value)}
          min={1}
          max={100}
          step={1}
          required
        />
        <p className="text-xs text-text-secondary">
          Quando houver esta quantidade (ou mais) de ofertas pendentes de envio, o delay de backlog
          passa a valer.
        </p>

        <Input
          label="Delay com backlog (minutos)"
          type="number"
          value={backlogDelayMinutes}
          onChange={(event) => setBacklogDelayMinutes(event.target.value)}
          min={1}
          max={60}
          step={1}
          required
        />
        <p className="text-xs text-text-secondary">
          Intervalo entre chamadas quando o limite de pendentes for atingido (1 a 60 min).
        </p>
      </form>
    </Modal>
  );
}
