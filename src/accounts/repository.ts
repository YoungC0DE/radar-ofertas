import type { Prisma } from '@prisma/client';
import { prisma } from '../database/client.js';
import { parseAccountRecord, parseAccountRow } from './account-config.js';
import { buildDefaultAccountsFromEnv } from './default-accounts.js';
import { DEFAULT_ACCOUNT_ID, type Account, type AccountPlatform } from './types.js';

let accountsCache: Account[] | null = null;

function accountKey(account: Pick<Account, 'id' | 'platform'>): string {
  return `${account.id}:${account.platform}`;
}

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
  const keepKeys = new Set(validated.map(accountKey));

  await prisma.$transaction(async (tx) => {
    const existing = await tx.account.findMany({ select: { id: true, platform: true } });
    for (const row of existing) {
      if (!keepKeys.has(`${row.id}:${row.platform}`)) {
        await tx.account.delete({
          where: { id_platform: { id: row.id, platform: row.platform } },
        });
      }
    }

    for (const account of validated) {
      const row = accountToRow(account);
      await tx.account.upsert({
        where: { id_platform: { id: account.id, platform: account.platform } },
        create: row,
        update: {
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

/** Garante contas default por plataforma após migrações ou instalações parciais. */
async function ensureDefaultPlatformAccounts(accounts: Account[]): Promise<Account[]> {
  const defaults = buildDefaultAccountsFromEnv();
  const missing = defaults.filter(
    (candidate) =>
      !accounts.some(
        (existing) => existing.id === candidate.id && existing.platform === candidate.platform,
      ),
  );
  if (missing.length === 0) return accounts;
  return persistAccounts([...accounts, ...missing]);
}

export async function loadAccounts(): Promise<Account[]> {
  if (accountsCache) return accountsCache;

  try {
    const rows = await prisma.account.findMany({
      orderBy: [{ id: 'asc' }, { platform: 'asc' }],
    });
    if (rows.length === 0) {
      return seedDefaultAccounts();
    }

    const loaded = rows.map((row) => parseAccountRow(row));
    accountsCache = await ensureDefaultPlatformAccounts(loaded);
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

export async function findAccount(
  id: string,
  platform: AccountPlatform,
): Promise<Account | null> {
  const accounts = await loadAccounts();
  return (
    accounts.find((account) => account.id === id && account.platform === platform) ?? null
  );
}

/** @deprecated Prefira findAccount(id, platform) quando a plataforma for conhecida. */
export async function findAccountById(
  id: string,
  platform?: AccountPlatform,
): Promise<Account | null> {
  const accounts = await loadAccounts();
  if (platform) {
    return accounts.find((account) => account.id === id && account.platform === platform) ?? null;
  }
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
