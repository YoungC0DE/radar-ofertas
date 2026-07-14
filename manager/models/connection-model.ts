import {
  openAffiliateLoginSession,
  isAffiliatePortalReady,
  persistAffiliateSession,
  type AffiliateLoginSession,
} from '../../src/mercado-livre/auth.js';
import { connectWhatsApp, disconnectWhatsApp } from '../../src/whatsapp/index.js';
import { logger } from '../../src/utils/logger.js';

// --- WhatsApp connection flow -------------------------------------------------

export type WhatsAppConnectStatus =
  | 'idle'
  | 'connecting'
  | 'qr'
  | 'connected'
  | 'error';

export interface WhatsAppConnectState {
  status: WhatsAppConnectStatus;
  qr: string | null;
  error: string | null;
}

let waStatus: WhatsAppConnectStatus = 'idle';
let waQr: string | null = null;
let waError: string | null = null;

export function getWhatsAppConnectionState(): WhatsAppConnectState {
  return { status: waStatus, qr: waQr, error: waError };
}

export function startWhatsAppConnection(): WhatsAppConnectState {
  if (waStatus === 'connecting' || waStatus === 'qr') {
    return getWhatsAppConnectionState();
  }

  waStatus = 'connecting';
  waQr = null;
  waError = null;

  void connectWhatsApp({
    onQr: (qr) => {
      waQr = qr;
      waStatus = 'qr';
    },
  })
    .then(async () => {
      waStatus = 'connected';
      waQr = null;
      // O painel só precisa autenticar e persistir as credenciais em disco.
      // Manter este socket aberto brigaria com o worker (connectionReplaced),
      // então desconectamos e deixamos o worker ser o único a usar o WhatsApp.
      await disconnectWhatsApp().catch(() => {});
    })
    .catch((error: unknown) => {
      waStatus = 'error';
      waQr = null;
      waError = error instanceof Error ? error.message : 'Falha ao conectar WhatsApp';
      logger.error({ error }, 'WhatsApp connection from manager failed');
    });

  return getWhatsAppConnectionState();
}

// --- Mercado Livre connection flow -------------------------------------------

export type MercadoLivreConnectStatus =
  | 'idle'
  | 'opening'
  | 'awaiting-login'
  | 'saving'
  | 'connected'
  | 'error';

export interface MercadoLivreConnectState {
  status: MercadoLivreConnectStatus;
  error: string | null;
}

let mlStatus: MercadoLivreConnectStatus = 'idle';
let mlError: string | null = null;
let mlSession: AffiliateLoginSession | undefined;

export function getMercadoLivreConnectionState(): MercadoLivreConnectState {
  return { status: mlStatus, error: mlError };
}

async function closeMlSession(): Promise<void> {
  const session = mlSession;
  mlSession = undefined;
  if (session) {
    await session.browser.close().catch(() => {});
  }
}

export function startMercadoLivreConnection(): MercadoLivreConnectState {
  if (mlStatus === 'opening' || mlStatus === 'awaiting-login' || mlStatus === 'saving') {
    return getMercadoLivreConnectionState();
  }

  mlStatus = 'opening';
  mlError = null;

  void (async () => {
    try {
      await closeMlSession();
      mlSession = await openAffiliateLoginSession();
      mlStatus = 'awaiting-login';
    } catch (error: unknown) {
      mlStatus = 'error';
      mlError = error instanceof Error ? error.message : 'Falha ao abrir navegador do Mercado Livre';
      logger.error({ error }, 'Mercado Livre login browser failed to open');
    }
  })();

  return getMercadoLivreConnectionState();
}

export async function finishMercadoLivreConnection(): Promise<MercadoLivreConnectState> {
  if (mlStatus !== 'awaiting-login' || !mlSession) {
    return getMercadoLivreConnectionState();
  }

  mlStatus = 'saving';
  mlError = null;

  try {
    const ready = await isAffiliatePortalReady(mlSession.page);
    if (!ready) {
      mlStatus = 'awaiting-login';
      mlError = 'Login ainda não detectado — conclua o login no navegador e tente novamente.';
      return getMercadoLivreConnectionState();
    }

    await persistAffiliateSession(mlSession.context);
    await closeMlSession();
    mlStatus = 'connected';
    mlError = null;
  } catch (error: unknown) {
    await closeMlSession();
    mlStatus = 'error';
    mlError = error instanceof Error ? error.message : 'Falha ao salvar sessão do Mercado Livre';
    logger.error({ error }, 'Mercado Livre session save failed');
  }

  return getMercadoLivreConnectionState();
}

export async function cancelMercadoLivreConnection(): Promise<void> {
  await closeMlSession();
  mlStatus = 'idle';
  mlError = null;
}
