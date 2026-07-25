import {
  addAccount,
  loadAccountsData,
  removeAccount,
  saveAccountTelegramConfig,
  saveAccountMercadoLivreConfig,
  saveAccountWhatsAppChannel,
  saveAccountWhatsAppDestination,
  removeAccountWhatsAppDestination,
  toggleAccount,
  toggleAccountWhatsAppDestination,
} from '../models/accounts-model.js';
import { isAccountPlatform, type AccountPlatform } from '../../src/accounts/types.js';
import { renderAccountsPage } from '../views/accounts.js';

type AccountsConfigRedirect = {
  accountId: string;
  platform: AccountPlatform;
};

function accountsRedirect(
  saved?: string,
  error?: string,
  config?: AccountsConfigRedirect,
): string {
  const params = new URLSearchParams();
  if (saved) params.set('saved', saved);
  if (error) params.set('error', error);
  if (config) {
    params.set('config', config.accountId);
    params.set('configPlatform', config.platform);
  }
  const query = params.toString();
  return query ? `/manager/accounts?${query}` : '/manager/accounts';
}

export async function showAccountsPage(
  saved: string | null = null,
  error: string | null = null,
  openConfigAccountId: string | null = null,
  openConfigPlatform: AccountPlatform | null = null,
): Promise<string> {
  const data = await loadAccountsData(saved, error, openConfigAccountId, openConfigPlatform);
  return renderAccountsPage(data);
}

export async function handleAccountAdd(form: Record<string, string>): Promise<string> {
  const result = await addAccount(form);
  if (!result.ok) {
    return showAccountsPage(null, result.error);
  }
  return showAccountsPage('Conta adicionada com sucesso');
}

export async function handleAccountToggle(
  accountId: string,
  platform: string,
): Promise<{ redirect: string }> {
  if (!isAccountPlatform(platform)) {
    return { redirect: accountsRedirect(undefined, 'Plataforma inválida') };
  }
  const result = await toggleAccount(accountId, platform);
  if (!result.ok) {
    return { redirect: accountsRedirect(undefined, result.error) };
  }
  return { redirect: accountsRedirect('1') };
}

export async function handleAccountDelete(
  accountId: string,
  platform: string,
): Promise<{ redirect: string }> {
  if (!isAccountPlatform(platform)) {
    return { redirect: accountsRedirect(undefined, 'Plataforma inválida') };
  }
  const result = await removeAccount(accountId, platform);
  if (!result.ok) {
    return { redirect: accountsRedirect(undefined, result.error) };
  }
  return { redirect: accountsRedirect('deleted') };
}

export async function handleAccountWhatsAppChannelSave(
  accountId: string,
  inviteLink: string,
): Promise<{ redirect: string }> {
  const result = await saveAccountWhatsAppChannel(accountId, inviteLink);
  if (!result.ok) {
    return { redirect: accountsRedirect(undefined, result.error, { accountId, platform: 'whatsapp' }) };
  }
  return { redirect: accountsRedirect('config', undefined, { accountId, platform: 'whatsapp' }) };
}

export async function handleAccountWhatsAppDestinationAdd(
  accountId: string,
  inviteInput: string,
): Promise<{ redirect: string }> {
  const result = await saveAccountWhatsAppDestination(accountId, inviteInput);
  if (!result.ok) {
    return { redirect: accountsRedirect(undefined, result.error, { accountId, platform: 'whatsapp' }) };
  }
  return { redirect: accountsRedirect('config', undefined, { accountId, platform: 'whatsapp' }) };
}

export async function handleAccountWhatsAppDestinationRemove(
  accountId: string,
  destinationId: string,
): Promise<{ redirect: string }> {
  const result = await removeAccountWhatsAppDestination(accountId, destinationId);
  if (!result.ok) {
    return { redirect: accountsRedirect(undefined, result.error, { accountId, platform: 'whatsapp' }) };
  }
  return { redirect: accountsRedirect('config', undefined, { accountId, platform: 'whatsapp' }) };
}

export async function handleAccountWhatsAppDestinationToggle(
  accountId: string,
  destinationId: string,
  enabled: boolean,
): Promise<{ redirect: string }> {
  const result = await toggleAccountWhatsAppDestination(accountId, destinationId, enabled);
  if (!result.ok) {
    return { redirect: accountsRedirect(undefined, result.error, { accountId, platform: 'whatsapp' }) };
  }
  return { redirect: accountsRedirect('config', undefined, { accountId, platform: 'whatsapp' }) };
}

export async function handleAccountTelegramConfigSave(
  accountId: string,
  form: Record<string, string>,
): Promise<{ redirect: string }> {
  const result = await saveAccountTelegramConfig(accountId, form);
  if (!result.ok) {
    return { redirect: accountsRedirect(undefined, result.error, { accountId, platform: 'telegram' }) };
  }
  return { redirect: accountsRedirect('config', undefined, { accountId, platform: 'telegram' }) };
}

export async function handleAccountMercadoLivreConfigSave(
  accountId: string,
  form: Record<string, string>,
): Promise<{ redirect: string }> {
  const result = await saveAccountMercadoLivreConfig(accountId, form);
  if (!result.ok) {
    return { redirect: accountsRedirect(undefined, result.error, { accountId, platform: 'mercado_livre' }) };
  }
  return { redirect: accountsRedirect('config', undefined, { accountId, platform: 'mercado_livre' }) };
}
