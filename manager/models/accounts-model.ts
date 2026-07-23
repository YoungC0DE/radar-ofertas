import {
  loadAccounts,
  saveAccounts,
  invalidateAccountsCache,
} from '../../src/accounts/repository.js';
import { resolveAccountAuthPath } from '../../src/accounts/paths.js';
import {
  ACCOUNT_PLATFORMS,
  DEFAULT_ACCOUNT_ID,
  accountPlatformLabel,
  isAccountPlatform,
} from '../../src/accounts/types.js';
import type { Account, AccountPlatform } from '../../src/accounts/types.js';
import type { SaveResult } from './shared/save-result.js';

export interface AccountsPageData {
  accounts: Account[];
  platforms: { id: AccountPlatform; label: string }[];
  saved: string | null;
  error: string | null;
}

export async function loadAccountsData(
  saved: string | null = null,
  error: string | null = null,
): Promise<AccountsPageData> {
  const accounts = await loadAccounts();
  const platforms = ACCOUNT_PLATFORMS
    .filter((p) => p !== 'mercado_livre')
    .map((p) => ({ id: p, label: accountPlatformLabel(p) }));

  return { accounts, platforms, saved, error };
}

export async function addAccount(form: Record<string, string>): Promise<SaveResult> {
  const { platform, label } = form;

  if (!platform || !isAccountPlatform(platform)) {
    return { ok: false, error: 'Plataforma inválida' };
  }
  if (!label?.trim()) {
    return { ok: false, error: 'Nome da conta é obrigatório' };
  }

  const accounts = await loadAccounts();
  const id = `${platform}-${Date.now().toString(36)}`;

  const newAccount: Account = platform === 'whatsapp'
    ? {
        id,
        platform: 'whatsapp',
        label: label.trim(),
        enabled: true,
        config: { channelId: '', authPath: resolveAccountAuthPath(id, 'whatsapp') },
      }
    : platform === 'telegram'
      ? {
          id,
          platform: 'telegram',
          label: label.trim(),
          enabled: true,
          config: { botToken: '', chatId: '' },
        }
      : {
          id,
          platform: 'mercado_livre',
          label: label.trim(),
          enabled: true,
          config: { authPath: resolveAccountAuthPath(id, 'mercado_livre') },
        };

  accounts.push(newAccount);
  await saveAccounts(accounts);
  invalidateAccountsCache();
  return { ok: true };
}

export async function updateAccount(
  accountId: string,
  form: Record<string, string>,
): Promise<SaveResult> {
  const accounts = await loadAccounts();
  const account = accounts.find((a) => a.id === accountId);

  if (!account) {
    return { ok: false, error: 'Conta não encontrada' };
  }

  if (form.label?.trim()) {
    account.label = form.label.trim();
  }

  if (form.enabled !== undefined) {
    account.enabled = form.enabled === 'true' || form.enabled === '1';
  }

  if (account.platform === 'whatsapp') {
    if (form.channelId !== undefined) account.config.channelId = form.channelId.trim();
  } else if (account.platform === 'telegram') {
    if (form.botToken !== undefined) account.config.botToken = form.botToken.trim();
    if (form.chatId !== undefined) account.config.chatId = form.chatId.trim();
  }

  await saveAccounts(accounts);
  invalidateAccountsCache();
  return { ok: true };
}

export async function removeAccount(accountId: string): Promise<SaveResult> {
  if (accountId === DEFAULT_ACCOUNT_ID) {
    return { ok: false, error: 'Não é possível remover a conta padrão' };
  }

  const accounts = await loadAccounts();
  const filtered = accounts.filter((a) => a.id !== accountId);

  if (filtered.length === accounts.length) {
    return { ok: false, error: 'Conta não encontrada' };
  }

  await saveAccounts(filtered);
  invalidateAccountsCache();
  return { ok: true };
}

export async function toggleAccount(accountId: string): Promise<SaveResult> {
  const accounts = await loadAccounts();
  const account = accounts.find((a) => a.id === accountId);

  if (!account) {
    return { ok: false, error: 'Conta não encontrada' };
  }

  account.enabled = !account.enabled;
  await saveAccounts(accounts);
  invalidateAccountsCache();
  return { ok: true };
}
