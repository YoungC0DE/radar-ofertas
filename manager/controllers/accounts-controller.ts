import {
  addAccount,
  loadAccountsData,
  removeAccount,
  toggleAccount,
} from '../models/accounts-model.js';
import { renderAccountsPage } from '../views/accounts.js';

export async function showAccountsPage(
  saved: string | null = null,
  error: string | null = null,
): Promise<string> {
  const data = await loadAccountsData(saved, error);
  return renderAccountsPage(data);
}

export async function handleAccountAdd(
  form: Record<string, string>,
): Promise<string> {
  const result = await addAccount(form);
  if (!result.ok) {
    return showAccountsPage(null, result.error);
  }
  return showAccountsPage('Conta adicionada com sucesso');
}

export async function handleAccountToggle(
  accountId: string,
): Promise<{ redirect: string }> {
  const result = await toggleAccount(accountId);
  if (!result.ok) {
    return { redirect: `/manager/accounts?error=${encodeURIComponent(result.error)}` };
  }
  return { redirect: '/manager/accounts?saved=1' };
}

export async function handleAccountDelete(
  accountId: string,
): Promise<{ redirect: string }> {
  const result = await removeAccount(accountId);
  if (!result.ok) {
    return { redirect: `/manager/accounts?error=${encodeURIComponent(result.error)}` };
  }
  return { redirect: '/manager/accounts?deleted=1' };
}
