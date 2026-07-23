import {
  openAffiliateLoginSession,
  isAffiliatePortalReady,
  persistAffiliateSession,
  type AffiliateLoginSession,
} from '../../src/mercado-livre/auth.js';
import { DEFAULT_ACCOUNT_ID } from '../../src/accounts/types.js';
import { env } from '../../src/config/env.js';
import { getWhatsAppConnectFromRedis } from '../../src/utils/redis-state.js';
import { logger } from '../../src/utils/logger.js';
import { canManagerSpawnWorkers, getWorkerState, startWorker } from './process-model.js';

// --- WhatsApp connection flow -------------------------------------------------
// Em produção o worker é dono da sessão e publica QR/status no Redis.
// O painel apenas lê e renderiza (stateless, replicável).

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

function resolveAccountId(): string {
  return env.WORKER_ACCOUNT_ID || DEFAULT_ACCOUNT_ID;
}

export async function getWhatsAppConnectionState(): Promise<WhatsAppConnectState> {
  const redisState = await getWhatsAppConnectFromRedis(resolveAccountId());
  if (redisState) {
    return { status: redisState.status, qr: redisState.qr, error: redisState.error };
  }

  return { status: 'idle', qr: null, error: null };
}

export async function startWhatsAppConnection(): Promise<WhatsAppConnectState> {
  const current = await getWhatsAppConnectionState();
  if (current.status === 'connecting' || current.status === 'qr' || current.status === 'connected') {
    return current;
  }

  if (canManagerSpawnWorkers()) {
    const worker = await getWorkerState('whatsapp');
    if (worker.status !== 'running' && worker.status !== 'starting') {
      await startWorker('whatsapp');
    }
    const after = await getWhatsAppConnectionState();
    return after.status === 'idle'
      ? { status: 'connecting', qr: null, error: null }
      : after;
  }

  const worker = await getWorkerState('whatsapp');
  if (worker.status !== 'running') {
    return {
      status: 'error',
      qr: null,
      error: 'Worker WhatsApp não detectado. Inicie o serviço worker (Docker ou terminal).',
    };
  }

  return { status: 'connecting', qr: null, error: null };
}

// --- Mercado Livre connection flow -------------------------------------------
// Fluxo stateful com Playwright — operação single-node/dev. Não replicável.

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
