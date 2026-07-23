import { prisma } from '../database/client.js';
import { buildDefaultAccountsFromEnv } from './default-accounts.js';
import { DEFAULT_ACCOUNT_ID, type Account, type AccountPlatform } from './types.js';

const SETTING_KEY = 'accounts';

let accountsCache: Account[] | null = null;

function parseAccountsJson(raw: string): Account[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('accounts setting must be a JSON array');
  }
  return parsed as Account[];
}

export async function loadAccounts(): Promise<Account[]> {
  if (accountsCache) return accountsCache;

  try {
    const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
    if (!row?.value) {
      accountsCache = buildDefaultAccountsFromEnv();
      return accountsCache;
    }
    accountsCache = parseAccountsJson(row.value);
    return accountsCache;
  } catch {
    accountsCache = buildDefaultAccountsFromEnv();
    return accountsCache;
  }
}

export async function saveAccounts(accounts: Account[]): Promise<void> {
  const json = JSON.stringify(accounts);
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: json },
    create: { key: SETTING_KEY, value: json },
  });
  accountsCache = accounts;
}

export async function findAccountById(id: string): Promise<Account | null> {
  const accounts = await loadAccounts();
  return accounts.find((account) => account.id === id) ?? null;
}

export async function findAccountsByPlatform(platform: AccountPlatform): Promise<Account[]> {
  const accounts = await loadAccounts();
  return accounts.filter((account) => account.platform === platform && account.enabled);
}

export async function getDefaultAccountForPlatform(platform: AccountPlatform): Promise<Account | null> {
  const accounts = await findAccountsByPlatform(platform);
  return accounts.find((account) => account.id === DEFAULT_ACCOUNT_ID) ?? accounts[0] ?? null;
}

export function invalidateAccountsCache(): void {
  accountsCache = null;
}
