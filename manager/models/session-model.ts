import { access } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../src/config/env.js';
import { loadSessionMeta, loadStorageState, hasValidSession } from '../../src/mercado-livre/session.js';
import { formatIsoInTimezone } from '../../src/utils/datetime.js';

export interface SessionStatus {
  label: string;
  ok: boolean;
  detail: string;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function getMercadoLivreSessionStatus(): Promise<SessionStatus> {
  const state = await loadStorageState();
  const meta = await loadSessionMeta();
  const valid = hasValidSession(state);

  if (!state) {
    return { label: 'Mercado Livre', ok: false, detail: 'Sem sessão — rode npm run ml:login' };
  }

  const detail = meta.lastError
    ? `Erro: ${meta.lastError}`
    : meta.lastRefreshAt
      ? `Atualizada em ${formatIsoInTimezone(meta.lastRefreshAt, env.APP_TIMEZONE)}`
      : meta.lastLoginAt
        ? `Login em ${formatIsoInTimezone(meta.lastLoginAt, env.APP_TIMEZONE)}`
        : 'Sessão presente';

  return { label: 'Mercado Livre', ok: valid, detail };
}

export async function getWhatsAppSessionStatus(): Promise<SessionStatus> {
  const credsPath = path.join(env.WHATSAPP_AUTH_PATH, 'creds.json');
  const exists = await pathExists(credsPath);

  if (!exists) {
    return { label: 'WhatsApp', ok: false, detail: 'Sem credenciais — rode npm run wa:login' };
  }

  return { label: 'WhatsApp', ok: true, detail: `Auth em ${env.WHATSAPP_AUTH_PATH}` };
}
