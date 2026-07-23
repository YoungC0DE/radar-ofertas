import type { Prisma } from '@prisma/client';
import { prisma } from '../database/client.js';
import { parseAccountRecord, parseAccountRow } from './account-config.js';
import { buildDefaultAccountsFromEnv } from './default-accounts.js';
import { DEFAULT_ACCOUNT_ID, type Account, type AccountPlatform } from './types.js';

let accountsCache: Account[] | null = null;

function accountToRow(account: Account): {
  id: string;
  platform: string;
  label: string;
  enabled: boolean;
  config: Prisma.InputJsonValue;
} {
  return {
    id: account.id,
    platform: account.platform,
    label: account.label,
    enabled: account.enabled,
    config: account.config as unknown as Prisma.InputJsonValue,
  };
}

async function persistAccounts(accounts: Account[]): Promise<Account[]> {
  const validated = accounts.map((account) => parseAccountRecord(account));
  const ids = validated.map((account) => account.id);

  await prisma.$transaction(async (tx) => {
    await tx.account.deleteMany({ where: { id: { notIn: ids } } });
    for (const account of validated) {
      const row = accountToRow(account);
      await tx.account.upsert({
        where: { id: account.id },
        create: row,
        update: {
          platform: row.platform,
          label: row.label,
          enabled: row.enabled,
          config: row.config,
        },
      });
    }
  });

  accountsCache = validated;
  const { notifyConfigCacheChange } = await import('../utils/config-cache-sync.js');
  await notifyConfigCacheChange('accounts');
  return validated;
}

async function seedDefaultAccounts(): Promise<Account[]> {
  return persistAccounts(buildDefaultAccountsFromEnv());
}

export async function loadAccounts(): Promise<Account[]> {
  if (accountsCache) return accountsCache;

  try {
    const rows = await prisma.account.findMany({ orderBy: { createdAt: 'asc' } });
    if (rows.length === 0) {
      return seedDefaultAccounts();
    }

    accountsCache = rows.map((row) => parseAccountRow(row));
    return accountsCache;
  } catch {
    accountsCache = buildDefaultAccountsFromEnv();
    return accountsCache;
  }
}

export async function saveAccounts(accounts: Account[]): Promise<void> {
  invalidateAccountsCache();
  await persistAccounts(accounts);
}

export async function findAccountById(id: string): Promise<Account | null> {
  const accounts = await loadAccounts();
  return accounts.find((account) => account.id === id) ?? null;
}

export async function findAccountsByPlatform(platform: AccountPlatform): Promise<Account[]> {
  const accounts = await loadAccounts();
  return accounts.filter((account) => account.platform === platform && account.enabled);
}

export async function getDefaultAccountForPlatform(
  platform: AccountPlatform,
): Promise<Account | null> {
  const accounts = await findAccountsByPlatform(platform);
  return accounts.find((account) => account.id === DEFAULT_ACCOUNT_ID) ?? accounts[0] ?? null;
}

export function invalidateAccountsCache(): void {
  accountsCache = null;
}
