import {
  createWhatsAppDestinationId,
  listWhatsAppDestinations,
  removeWhatsAppDestination,
  syncLegacyWhatsAppChannelFields,
  toggleWhatsAppDestination,
  upsertWhatsAppDestination,
} from '../../src/accounts/whatsapp-destinations.js';
import { getDefaultAccountForPlatform } from '../../src/accounts/repository.js';
import { saveAccounts, loadAccounts } from '../../src/accounts/repository.js';
import { type WhatsAppAccount, type WhatsAppDestination } from '../../src/accounts/types.js';
import {
  connectWhatsApp,
  setWhatsAppAuthPath,
  WhatsAppOwnedElsewhereError,
} from '../../src/whatsapp/index.js';
import { resolveWhatsAppInvite } from '../../src/whatsapp/invite.js';
import { resolveAccountAuthPath } from '../../src/accounts/paths.js';
import type { SaveResult } from './shared/save-result.js';

export interface WhatsAppDestinationView {
  id: string;
  jid: string;
  kind: WhatsAppDestination['kind'];
  label: string | null;
  inviteLink: string | null;
  enabled: boolean;
  kindLabel: string;
}

function toView(destination: WhatsAppDestination): WhatsAppDestinationView {
  return {
    id: destination.id,
    jid: destination.jid,
    kind: destination.kind,
    label: destination.label ?? null,
    inviteLink: destination.inviteLink ?? null,
    enabled: destination.enabled,
    kindLabel: destination.kind === 'group' ? 'Grupo' : 'Canal',
  };
}

async function getDefaultWhatsAppAccount(): Promise<WhatsAppAccount | null> {
  const account = await getDefaultAccountForPlatform('whatsapp');
  if (!account || account.platform !== 'whatsapp') return null;
  return account;
}

async function persistWhatsAppAccount(account: WhatsAppAccount): Promise<void> {
  const accounts = await loadAccounts();
  const index = accounts.findIndex(
    (row) => row.id === account.id && row.platform === 'whatsapp',
  );
  const next = [...accounts];
  if (index >= 0) {
    next[index] = account;
  } else {
    next.push(account);
  }
  await saveAccounts(next);
}

export async function loadWhatsAppDestinationViews(): Promise<WhatsAppDestinationView[]> {
  const account = await getDefaultWhatsAppAccount();
  if (!account) return [];
  return listWhatsAppDestinations(account.config).map(toView);
}

export async function addWhatsAppDestination(inviteInput: string): Promise<SaveResult> {
  const trimmed = inviteInput.trim();
  if (!trimmed) {
    return { ok: false, error: 'Informe o link de convite ou JID do destino' };
  }

  const account = await getDefaultWhatsAppAccount();
  if (!account) {
    return { ok: false, error: 'Conta WhatsApp padrão não encontrada' };
  }

  setWhatsAppAuthPath(resolveAccountAuthPath(account.id, 'whatsapp'));

  try {
    const sock = await connectWhatsApp();
    const resolved = await resolveWhatsAppInvite(sock, trimmed);
    const destinations = listWhatsAppDestinations(account.config);
    const duplicate = destinations.some((destination) => destination.jid === resolved.jid);
    if (duplicate) {
      return { ok: false, error: 'Este destino já está configurado' };
    }

    const destination: WhatsAppDestination = {
      id: createWhatsAppDestinationId(),
      jid: resolved.jid,
      kind: resolved.kind,
      label: resolved.label,
      inviteLink: resolved.inviteLink,
      enabled: true,
    };

    const nextConfig = upsertWhatsAppDestination(account.config, destination);
    await persistWhatsAppAccount({ ...account, config: nextConfig });
    return { ok: true };
  } catch (error) {
    if (error instanceof WhatsAppOwnedElsewhereError) {
      return {
        ok: false,
        error:
          'WhatsApp ativo em outro processo — pare o worker, adicione o destino e inicie de novo',
      };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

export async function removeWhatsAppDestinationById(destinationId: string): Promise<SaveResult> {
  const account = await getDefaultWhatsAppAccount();
  if (!account) {
    return { ok: false, error: 'Conta WhatsApp padrão não encontrada' };
  }

  const nextConfig = removeWhatsAppDestination(account.config, destinationId);
  await persistWhatsAppAccount({ ...account, config: syncLegacyWhatsAppChannelFields(nextConfig) });
  return { ok: true };
}

export async function setWhatsAppDestinationEnabled(
  destinationId: string,
  enabled: boolean,
): Promise<SaveResult> {
  const account = await getDefaultWhatsAppAccount();
  if (!account) {
    return { ok: false, error: 'Conta WhatsApp padrão não encontrada' };
  }

  const nextConfig = toggleWhatsAppDestination(account.config, destinationId, enabled);
  await persistWhatsAppAccount({ ...account, config: syncLegacyWhatsAppChannelFields(nextConfig) });
  return { ok: true };
}

export async function ensureDefaultWhatsAppDestinationFromEnv(): Promise<void> {
  const account = await getDefaultWhatsAppAccount();
  if (!account) return;

  const destinations = listWhatsAppDestinations(account.config);
  if (destinations.length > 0) return;

  const synced = syncLegacyWhatsAppChannelFields(account.config);
  if (synced.destinations?.length) {
    await persistWhatsAppAccount({ ...account, config: synced });
  }
}
