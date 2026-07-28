import { useEffect, useState } from 'react';

import type { MercadoLivreConnectState, WhatsAppConnectState } from '../../types/api.js';
import { Button } from '../ui/Button.js';
import { Modal } from '../ui/Modal.js';
import { usePolling } from '../../hooks/usePolling.js';

const QR_API = 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=';

type WhatsAppLoginModalProps = {
  open: boolean;
  accountId: string | null;
  onClose: () => void;
  onStart: (accountId: string) => Promise<WhatsAppConnectState>;
  onPoll: (accountId: string) => Promise<WhatsAppConnectState>;
  onConnected: () => void;
};

export function WhatsAppLoginModal({
  open,
  accountId,
  onClose,
  onStart,
  onPoll,
  onConnected,
}: WhatsAppLoginModalProps) {
  const [state, setState] = useState<WhatsAppConnectState>({
    status: 'idle',
    qr: null,
    error: null,
  });

  useEffect(() => {
    if (!open || !accountId) return;
    setState({ status: 'connecting', qr: null, error: null });
    void onStart(accountId).then(setState).catch(() => {
      setState({ status: 'error', qr: null, error: 'Falha ao iniciar conexão' });
    });
  }, [open, accountId, onStart]);

  usePolling(
    () => {
      if (!accountId) return Promise.resolve(state);
      return onPoll(accountId);
    },
    (next) => {
      setState(next);
      if (next.status === 'connected') {
        onConnected();
      }
    },
    1500,
    open && accountId != null && state.status !== 'connected' && state.status !== 'error',
  );

  function renderStatus() {
    switch (state.status) {
      case 'connecting':
        return 'Iniciando conexão…';
      case 'qr':
        return 'Escaneie o QR code com o WhatsApp:';
      case 'connected':
        return 'WhatsApp conectado com sucesso!';
      case 'error':
        return 'Não foi possível conectar.';
      default:
        return 'Aguardando worker…';
    }
  }

  return (
    <Modal
      open={open}
      title="Logar no WhatsApp"
      onClose={onClose}
      wide
      footer={
        <Button variant="secondary" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium text-text-primary">{renderStatus()}</p>
        {state.status === 'qr' && state.qr ? (
          <div className="flex flex-col items-center gap-4">
            <img
              src={`${QR_API}${encodeURIComponent(state.qr)}`}
              alt="QR code do WhatsApp"
              width={280}
              height={280}
              className="rounded-xl border border-border"
            />
            <p className="text-center text-xs text-text-secondary">
              No celular, abra WhatsApp › <strong>Aparelhos conectados</strong> ›{' '}
              <strong>Conectar um aparelho</strong>.
            </p>
          </div>
        ) : null}
        {state.error ? <p className="text-sm text-error">{state.error}</p> : null}
      </div>
    </Modal>
  );
}

type MercadoLivreLoginModalProps = {
  open: boolean;
  accountId: string | null;
  onClose: () => void;
  onStart: (accountId: string) => Promise<MercadoLivreConnectState>;
  onPoll: (accountId: string) => Promise<MercadoLivreConnectState>;
  onFinish: (accountId: string) => Promise<MercadoLivreConnectState>;
  onCancel: (accountId: string) => Promise<void>;
  onConnected: () => void;
};

export function MercadoLivreLoginModal({
  open,
  accountId,
  onClose,
  onStart,
  onPoll,
  onFinish,
  onCancel,
  onConnected,
}: MercadoLivreLoginModalProps) {
  const [state, setState] = useState<MercadoLivreConnectState>({ status: 'idle', error: null });
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!open || !accountId) return;
    setState({ status: 'opening', error: null });
    void onStart(accountId).then(setState).catch(() => {
      setState({ status: 'error', error: 'Falha ao abrir navegador' });
    });
  }, [open, accountId, onStart]);

  usePolling(
    () => {
      if (!accountId) return Promise.resolve(state);
      return onPoll(accountId);
    },
    (next) => {
      setState(next);
      if (next.status === 'connected') onConnected();
    },
    1500,
    open && accountId != null && !['connected', 'error'].includes(state.status),
  );

  async function handleFinish() {
    if (!accountId) return;
    setFinishing(true);
    try {
      const next = await onFinish(accountId);
      setState(next);
      if (next.status === 'connected') onConnected();
    } finally {
      setFinishing(false);
    }
  }

  async function handleCancel() {
    if (accountId) await onCancel(accountId);
    onClose();
  }

  function renderStatus() {
    switch (state.status) {
      case 'opening':
        return 'Abrindo o navegador…';
      case 'awaiting-login':
        return 'Navegador aberto. Faça login e clique em Concluir.';
      case 'saving':
        return 'Salvando sessão…';
      case 'connected':
        return 'Sessão do Mercado Livre salva com sucesso!';
      case 'error':
        return 'Não foi possível abrir o navegador.';
      default:
        return 'Aguardando…';
    }
  }

  return (
    <Modal
      open={open}
      title="Logar no Mercado Livre"
      onClose={() => void handleCancel()}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={() => void handleCancel()}>
            Cancelar
          </Button>
          <Button
            onClick={() => void handleFinish()}
            disabled={finishing || state.status === 'opening' || state.status === 'connected'}
          >
            {finishing ? 'Salvando…' : 'Concluir'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium text-text-primary">{renderStatus()}</p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-text-secondary">
          <li>Uma janela do navegador abre no portal de afiliados do Mercado Livre.</li>
          <li>
            Faça login e acesse o <strong>Gerador de Links</strong>.
          </li>
          <li>
            Volte aqui e clique em <strong>Concluir</strong> para salvar a sessão.
          </li>
        </ol>
        {state.error ? <p className="text-sm text-error">{state.error}</p> : null}
      </div>
    </Modal>
  );
}
