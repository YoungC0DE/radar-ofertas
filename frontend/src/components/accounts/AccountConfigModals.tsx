import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import type { AccountCard as AccountCardData } from '../../types/api.js';
import { Badge } from '../ui/Badge.js';
import { Button } from '../ui/Button.js';
import { Checkbox } from '../ui/Checkbox.js';
import { Input } from '../ui/Input.js';
import { Modal, ModalActions } from '../ui/Modal.js';

type WhatsAppConfigModalProps = {
  card: AccountCardData;
  open: boolean;
  onClose: () => void;
  onSaveChannel: (inviteLink: string) => Promise<void>;
  onAddDestination: (inviteInput: string) => Promise<void>;
  onToggleDestination: (destinationId: string, enabled: boolean) => Promise<void>;
  onRemoveDestination: (destinationId: string) => Promise<void>;
};

export function WhatsAppConfigModal({
  card,
  open,
  onClose,
  onSaveChannel,
  onAddDestination,
  onToggleDestination,
  onRemoveDestination,
}: WhatsAppConfigModalProps) {
  const whatsapp = card.whatsapp;
  const [inviteLink, setInviteLink] = useState(whatsapp?.channelInviteLink ?? '');
  const [destinationInput, setDestinationInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !whatsapp) return;
    setInviteLink(whatsapp.channelInviteLink);
    setDestinationInput('');
  }, [open, whatsapp]);

  if (!whatsapp) return null;

  async function handleSaveChannel(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await onSaveChannel(inviteLink.trim());
    } finally {
      setLoading(false);
    }
  }

  async function handleAddDestination(event: FormEvent) {
    event.preventDefault();
    if (!destinationInput.trim()) return;
    setLoading(true);
    try {
      await onAddDestination(destinationInput.trim());
      setDestinationInput('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      title={`Configurar WhatsApp — ${card.account.label}`}
      onClose={onClose}
      wide
      footer={
        <Button variant="secondary" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      {whatsapp.channelConfigured ? (
        <p className="mb-4 text-sm text-success">
          Canal configurado: <strong>{whatsapp.channelName ?? 'Canal WhatsApp'}</strong>{' '}
          <code className="rounded bg-bg-secondary px-1.5 py-0.5 text-[0.82rem]">{whatsapp.channelId}</code>
        </p>
      ) : (
        <p className="mb-4 text-sm text-warning">Nenhum canal configurado ainda.</p>
      )}

      <form className="flex flex-col gap-4" onSubmit={(event) => void handleSaveChannel(event)}>
        <Input
          label="Link de compartilhamento do canal"
          value={inviteLink}
          required
          placeholder="https://whatsapp.com/channel/AbCdEfGhIjKlMn"
          onChange={(event) => setInviteLink(event.target.value)}
        />
        <p className="text-xs text-text-secondary">
          Use <strong>Logar</strong> na tela de Contas para autenticar o WhatsApp antes de salvar.
        </p>
        <Button type="submit" disabled={loading}>
          Salvar canal principal
        </Button>
      </form>

      <div className="my-5 border-t border-border" />

      <h4 className="mb-3 text-sm font-semibold text-text-primary">Destinos adicionais</h4>
      {whatsapp.destinations.length > 0 ? (
        <ul className="mb-4 flex flex-col gap-3">
          {whatsapp.destinations.map((destination) => (
            <li
              key={destination.id}
              className="rounded-xl border border-border bg-bg-secondary/40 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <strong>{destination.label?.trim() || 'Sem nome'}</strong>
                <span className="text-sm text-text-secondary">{destination.kindLabel}</span>
                <Badge tone={destination.enabled ? 'success' : 'warning'}>
                  {destination.enabled ? 'Ativo' : 'Pausado'}
                </Badge>
              </div>
              <div className="mt-2">
                <code className="rounded bg-bg-secondary px-1.5 py-0.5 text-[0.82rem]">
                  {destination.jid}
                </code>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() =>
                    void onToggleDestination(destination.id, !destination.enabled)
                  }
                >
                  {destination.enabled ? 'Pausar' : 'Ativar'}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => void onRemoveDestination(destination.id)}
                >
                  Remover
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-text-secondary">
          Nenhum destino extra — adicione grupos ou canais abaixo.
        </p>
      )}

      <form className="flex flex-col gap-4" onSubmit={(event) => void handleAddDestination(event)}>
        <Input
          label="Adicionar destino (grupo ou canal)"
          value={destinationInput}
          placeholder="https://chat.whatsapp.com/... ou https://whatsapp.com/channel/..."
          onChange={(event) => setDestinationInput(event.target.value)}
        />
        <Button type="submit" variant="secondary" disabled={loading}>
          Adicionar destino
        </Button>
      </form>
    </Modal>
  );
}

type TelegramConfigModalProps = {
  card: AccountCardData;
  open: boolean;
  onClose: () => void;
  onSave: (body: { enabled: boolean; botToken: string; chatId: string }) => Promise<void>;
};

export function TelegramConfigModal({ card, open, onClose, onSave }: TelegramConfigModalProps) {
  const telegram = card.telegram;
  const [enabled, setEnabled] = useState(card.account.enabled);
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState(telegram?.chatId ?? '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEnabled(card.account.enabled);
    setBotToken('');
    setChatId(telegram?.chatId ?? '');
  }, [open, card.account.enabled, telegram?.chatId]);

  if (!telegram) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await onSave({ enabled, botToken, chatId: chatId.trim() });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      title={`Configurar Telegram — ${card.account.label}`}
      onClose={onClose}
      wide
      footer={
        <ModalActions
          onCancel={onClose}
          onConfirm={() => void handleSubmit({ preventDefault: () => undefined } as FormEvent)}
          loading={loading}
        />
      }
    >
      <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <Checkbox
          label="Ativar publicação no Telegram"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        <Input
          label="Token do bot (@BotFather)"
          type="password"
          value={botToken}
          placeholder={
            telegram.hasBotToken
              ? 'Token já configurado — deixe em branco para manter'
              : '123456789:ABCdefGHI...'
          }
          autoComplete="off"
          onChange={(event) => setBotToken(event.target.value)}
        />
        <Input
          label="Canal de destino"
          value={chatId}
          placeholder="@meucanal ou -1001234567890"
          onChange={(event) => setChatId(event.target.value)}
        />
        <p className="text-xs text-text-secondary">
          Depois de salvar, use <strong>Logar</strong> para verificar a conexão com o Telegram.
        </p>
      </form>
    </Modal>
  );
}

type MercadoLivreConfigModalProps = {
  card: AccountCardData;
  open: boolean;
  onClose: () => void;
  onSave: (affiliateTag: string) => Promise<void>;
};

export function MercadoLivreConfigModal({
  card,
  open,
  onClose,
  onSave,
}: MercadoLivreConfigModalProps) {
  const ml = card.mercadoLivre;
  const storedTag = String(card.account.config.affiliateTag ?? '').trim();
  const [affiliateTag, setAffiliateTag] = useState(storedTag);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAffiliateTag(storedTag);
  }, [open, storedTag]);

  if (!ml) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await onSave(affiliateTag.trim());
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      title={`Configurar Mercado Livre — ${card.account.label}`}
      onClose={onClose}
      wide
      footer={
        <ModalActions
          onCancel={onClose}
          onConfirm={() => void handleSubmit({ preventDefault: () => undefined } as FormEvent)}
          loading={loading}
        />
      }
    >
      <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <Input
          label="Tag de afiliado"
          value={affiliateTag}
          placeholder="seu-tag-ml"
          autoComplete="off"
          onChange={(event) => setAffiliateTag(event.target.value)}
        />
        <p className="text-xs text-text-secondary">
          {ml.affiliateTagFromEnv && ml.affiliateTag
            ? `Atualmente herdando do AFFILIATE_CONFIG: ${ml.affiliateTag}.`
            : 'Deixe vazio para usar o valor de AFFILIATE_CONFIG no .env.'}
        </p>
        <p className="text-xs text-text-secondary">
          Sessão: {ml.sessionDetail} — use <strong>Logar</strong> para renovar.
        </p>
      </form>
    </Modal>
  );
}
