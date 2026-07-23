import { createPublisher } from '../channels/publisher-factory.js';
import type { ChannelPublisher } from '../channels/types.js';
import { env } from '../config/env.js';
import { setWhatsAppAuthPath } from '../whatsapp/index.js';
import { resolveAccountAuthPath } from './paths.js';
import { findAccountById } from './repository.js';
import { DEFAULT_ACCOUNT_ID, type Account, type AccountPlatform } from './types.js';

export function resolveWorkerAccountId(): string {
  return env.WORKER_ACCOUNT_ID.trim() || DEFAULT_ACCOUNT_ID;
}

function assertAccountPlatform(
  account: Account,
  platform: AccountPlatform,
  accountId: string,
): void {
  if (account.platform !== platform) {
    throw new Error(`Conta "${accountId}" é ${account.platform}, esperado ${platform}`);
  }
  if (!account.enabled) {
    throw new Error(`Conta "${accountId}" está desabilitada`);
  }
}

/** Carrega a conta do worker e configura paths de sessão antes de conectar. */
export async function loadWorkerPublisher(platform: AccountPlatform): Promise<ChannelPublisher> {
  const accountId = resolveWorkerAccountId();
  const account = await findAccountById(accountId);
  if (!account) {
    throw new Error(`Conta "${accountId}" não encontrada`);
  }

  assertAccountPlatform(account, platform, accountId);

  if (platform === 'whatsapp') {
    setWhatsAppAuthPath(resolveAccountAuthPath(accountId, 'whatsapp'));
  }

  return createPublisher(account);
}
