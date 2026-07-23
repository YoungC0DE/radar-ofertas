export {
  ACCOUNT_PLATFORMS,
  DEFAULT_ACCOUNT_ID,
  accountPlatformLabel,
  isAccountPlatform,
} from './types.js';
export type {
  Account,
  AccountPlatform,
  MercadoLivreAccount,
  MercadoLivreAccountConfig,
  TelegramAccount,
  TelegramAccountConfig,
  WhatsAppAccount,
  WhatsAppAccountConfig,
} from './types.js';

export { resolveAccountAuthPath, resolveAccountsDataRoot } from './paths.js';
export { buildDefaultAccountsFromEnv } from './default-accounts.js';
export {
  findAccount,
  findAccountById,
  findAccountsByPlatform,
  getDefaultAccountForPlatform,
  invalidateAccountsCache,
  loadAccounts,
  saveAccounts,
} from './repository.js';
export { getEnabledAccountIdsForChannel } from './channel-accounts.js';
