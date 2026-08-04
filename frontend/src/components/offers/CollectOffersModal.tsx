import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '../ui/Button.js';
import { Checkbox } from '../ui/Checkbox.js';
import { Input } from '../ui/Input.js';
import { Modal } from '../ui/Modal.js';

export type CollectOffersPayload = {
  productName?: string;
  searchLimit: number;
  sendAfterCollect: boolean;
  sendDelayMinutes?: number;
};

type CollectOffersModalProps = {
  readonly open: boolean;
  readonly defaultSearchLimit: number;
  readonly defaultSendDelayMinutes?: number;
  readonly onClose: () => void;
  readonly onSubmit: (payload: CollectOffersPayload) => Promise<void>;
};

const FORM_ID = 'collect-offers-form';

export function CollectOffersModal({
  open,
  defaultSearchLimit,
  defaultSendDelayMinutes = 1,
  onClose,
  onSubmit,
}: CollectOffersModalProps) {
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState(String(Math.min(50, Math.max(1, defaultSearchLimit))));
  const [sendAfterCollect, setSendAfterCollect] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState(String(Math.max(1, defaultSendDelayMinutes)));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setProductName('');
    setQuantity(String(Math.min(50, Math.max(1, defaultSearchLimit))));
    setSendAfterCollect(false);
    setDelayMinutes(String(Math.max(1, defaultSendDelayMinutes)));
  }, [open, defaultSearchLimit, defaultSendDelayMinutes]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedName = productName.trim();

    const searchLimit = Number.parseInt(quantity, 10);
    if (!Number.isFinite(searchLimit) || searchLimit < 1 || searchLimit > 50) return;

    const payload: CollectOffersPayload = {
      searchLimit,
      sendAfterCollect,
    };
    if (trimmedName) payload.productName = trimmedName;

    if (sendAfterCollect) {
      const sendDelayMinutes = Number.parseInt(delayMinutes, 10);
      if (!Number.isFinite(sendDelayMinutes) || sendDelayMinutes < 1) return;
      payload.sendDelayMinutes = sendDelayMinutes;
    }

    setLoading(true);
    try {
      await onSubmit(payload);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Buscar Ofertas"
      onClose={loading ? () => undefined : onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={loading} disabled={loading}>
            {loading ? 'Enfileirando…' : 'Buscar'}
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        className="flex flex-col gap-4"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <Input
          label="Nome do produto"
          type="text"
          value={productName}
          onChange={(event) => setProductName(event.target.value)}
          placeholder="Ex.: notebook gamer, iPhone 15…"
          hint="Opcional — se vazio, usa as fontes configuradas."
          autoFocus
        />
        <Input
          label="Quantidade de anúncios"
          type="number"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          min={1}
          max={50}
          step={1}
          required
        />
        <p className="text-xs text-text-secondary">Máximo de 50 anúncios por busca.</p>

        <Checkbox
          label="Enviar assim que finalizar a busca"
          checked={sendAfterCollect}
          onChange={(event) => setSendAfterCollect(event.target.checked)}
        />

        {sendAfterCollect ? (
          <Input
            label="Delay entre envios (minutos)"
            type="number"
            value={delayMinutes}
            onChange={(event) => setDelayMinutes(event.target.value)}
            min={1}
            max={120}
            step={1}
            required
          />
        ) : null}
      </form>
    </Modal>
  );
}
