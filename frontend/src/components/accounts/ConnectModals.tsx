import { useEffect, useRef, useState } from 'react';

import type { MercadoLivreConnectState, WhatsAppConnectState } from '../../types/api.js';
import { usePolling } from '../../hooks/usePolling.js';
import { buildNovncUrl } from '../../utils/novnc.js';
import { Button } from '../ui/Button.js';
import { Modal } from '../ui/Modal.js';

const QR_API = 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=';
const IDLE_ML_STATE: MercadoLivreConnectState = { status: 'idle', error: null, novncPort: null };

type WhatsAppLoginModalProps = {
  open: boolean;
  accountId: string | null;
  onClose: () => void;
  onStart: (accountId: string) => Promise<WhatsAppConnectState>;
  onPoll: (accountId: string) => Promise<WhatsAppConnectState>;
  onConnected: () => void;
};

function shouldKeepWhatsAppPolling(status: WhatsAppConnectState['status']): boolean {
  return status !== 'connected';
}

/** Evita regressão idle/error sobrescrever QR já obtido no poll. */
function mergeWhatsAppState(
  previous: WhatsAppConnectState,
  next: WhatsAppConnectState,
): WhatsAppConnectState {
  if (next.status === 'idle' && (previous.status === 'connecting' || previous.status === 'qr')) {
    return previous;
  }
  if (
    next.status === 'connecting' &&
    previous.status === 'qr' &&
    previous.qr &&
    !next.qr
  ) {
    return previous;
  }
  return next;
}

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
  const onStartRef = useRef(onStart);
  const onPollRef = useRef(onPoll);
  const onConnectedRef = useRef(onConnected);
  onStartRef.current = onStart;
  onPollRef.current = onPoll;
  onConnectedRef.current = onConnected;

  useEffect(() => {
    if (!open || !accountId) {
      setState({ status: 'idle', qr: null, error: null });
      return;
    }
    setState({ status: 'connecting', qr: null, error: null });
    let cancelled = false;
    void onStartRef.current(accountId)
      .then((next) => {
        if (!cancelled) setState((prev) => mergeWhatsAppState(prev, next));
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: 'error', qr: null, error: 'Falha ao iniciar conexão' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, accountId]);

  usePolling(
    () => {
      if (!accountId) {
        return Promise.resolve({ status: 'idle', qr: null, error: null } satisfies WhatsAppConnectState);
      }
      return onPollRef.current(accountId);
    },
    (next) => {
      setState((prev) => {
        const merged = mergeWhatsAppState(prev, next);
        if (merged.status === 'connected' && prev.status !== 'connected') {
          onConnectedRef.current();
        }
        return merged;
      });
    },
    1500,
    open && accountId != null && shouldKeepWhatsAppPolling(state.status),
  );

  function renderStatus() {
    switch (state.status) {
      case 'connecting':
        return state.error || 'Iniciando conexão…';
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
        {state.error && state.status !== 'connecting' ? (
          <p className="text-sm text-error">{state.error}</p>
        ) : null}
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
  const [state, setState] = useState<MercadoLivreConnectState>(IDLE_ML_STATE);
  const [finishing, setFinishing] = useState(false);
  const onStartRef = useRef(onStart);
  const onPollRef = useRef(onPoll);
  const onConnectedRef = useRef(onConnected);
  onStartRef.current = onStart;
  onPollRef.current = onPoll;
  onConnectedRef.current = onConnected;

  useEffect(() => {
    if (!open || !accountId) {
      setState(IDLE_ML_STATE);
      return;
    }
    setState({ status: 'opening', error: null, novncPort: null });
    let cancelled = false;
    void onStartRef.current(accountId)
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: 'error', error: 'Falha ao abrir navegador', novncPort: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, accountId]);

  usePolling(
    () => {
      if (!accountId) {
        return Promise.resolve(IDLE_ML_STATE);
      }
      return onPollRef.current(accountId);
    },
    (next) => {
      setState(next);
      if (next.status === 'connected') onConnectedRef.current();
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

  const novncUrl = buildNovncUrl(state.novncPort);

  function renderStatus() {
    switch (state.status) {
      case 'opening':
        return novncUrl
          ? 'Abrindo o navegador no desktop do container…'
          : 'Abrindo o navegador…';
      case 'awaiting-login':
        return novncUrl
          ? 'Navegador aberto no noVNC. Faça login e clique em Concluir.'
          : 'Navegador aberto. Faça login e clique em Concluir.';
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
        {novncUrl ? (
          <>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-text-secondary">
              <li>
                Abra o{' '}
                <a
                  className="font-medium text-accent underline"
                  href={novncUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  noVNC
                </a>{' '}
                para ver o desktop do container.
              </li>
              <li>O Chromium abre no portal de afiliados — faça login normalmente.</li>
              <li>
                Acesse o <strong>Gerador de Links</strong> e volte aqui para clicar em{' '}
                <strong>Concluir</strong>.
              </li>
            </ol>
            <p className="text-xs text-text-secondary">
              Se a aba não abriu automaticamente, use o link noVNC acima.
            </p>
          </>
        ) : (
          <ol className="list-decimal space-y-2 pl-5 text-sm text-text-secondary">
            <li>Uma janela do navegador abre no portal de afiliados do Mercado Livre.</li>
            <li>
              Faça login e acesse o <strong>Gerador de Links</strong>.
            </li>
            <li>
              Volte aqui e clique em <strong>Concluir</strong> para salvar a sessão.
            </li>
          </ol>
        )}
        {state.error ? <p className="text-sm text-error whitespace-pre-wrap">{state.error}</p> : null}
      </div>
    </Modal>
  );
}
