import type { Channel } from '../channels/types.js';
import { findAccountsByPlatform } from './repository.js';
import { DEFAULT_ACCOUNT_ID } from './types.js';

/** Contas habilitadas para um canal de envio; fallback `default` se nenhuma cadastrada. */
export async function getEnabledAccountIdsForChannel(channel: Channel): Promise<string[]> {
  const accounts = await findAccountsByPlatform(channel);
  if (accounts.length === 0) return [DEFAULT_ACCOUNT_ID];
  return accounts.map((account) => account.id);
}
