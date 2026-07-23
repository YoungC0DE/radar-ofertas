import path from 'node:path';
import { env } from '../config/env.js';
import { DEFAULT_ACCOUNT_ID, type AccountPlatform } from './types.js';

const DATA_ROOT = './data';

/**
 * Caminho de auth isolado por conta. A conta default reutiliza os paths do .env
 * para não quebrar instalações existentes; contas adicionais ficam em
 * data/accounts/{accountId}/{platform}/.
 */
export function resolveAccountAuthPath(accountId: string, platform: AccountPlatform): string {
  if (accountId === DEFAULT_ACCOUNT_ID) {
    if (platform === 'whatsapp') return env.WHATSAPP_AUTH_PATH;
    if (platform === 'mercado_livre') return env.ML_AUTH_PATH;
    return path.join(DATA_ROOT, 'accounts', accountId, platform);
  }

  return path.join(DATA_ROOT, 'accounts', accountId, platform);
}

export function resolveAccountsDataRoot(): string {
  return path.join(DATA_ROOT, 'accounts');
}
