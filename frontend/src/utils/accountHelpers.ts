import type { AccountCard } from '../types/api.js';

export function isIntegrationConfigured(card: AccountCard): boolean {
  if (card.account.platform === 'whatsapp' && card.whatsapp) {
    return card.whatsapp.channelConfigured;
  }
  if (card.account.platform === 'telegram' && card.telegram) {
    return Boolean(card.telegram.chatId.trim() && card.telegram.hasBotToken);
  }
  return true;
}

export function resolveIntegrationDisplayStatus(card: AccountCard): 'active' | 'inactive' {
  if (!isIntegrationConfigured(card)) return 'inactive';
  if (!card.connection?.loggedIn) return 'inactive';
  return card.account.enabled ? 'active' : 'inactive';
}

export function resolveMarketplaceDisplayStatus(card: AccountCard): 'active' | 'inactive' {
  const active = card.account.enabled && (card.connection?.loggedIn ?? false);
  return active ? 'active' : 'inactive';
}
