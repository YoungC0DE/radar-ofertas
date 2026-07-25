import { loadAccounts } from '../accounts/repository.js';
import { getEnabledWhatsAppDestinations } from '../accounts/whatsapp-destinations.js';
import { DEFAULT_ACCOUNT_ID, type WhatsAppAccount } from '../accounts/types.js';
import { env } from '../config/env.js';

export type TelegramIntegration = {
  enabled: boolean;
  botToken: string;
  chatId: string;
};

let whatsappConfigured = false;
let telegramIntegration: TelegramIntegration = { enabled: false, botToken: '', chatId: '' };

export function getTelegramIntegration(): TelegramIntegration {
  return telegramIntegration;
}

export function isWhatsAppIntegrationConfigured(): boolean {
  return whatsappConfigured;
}

export function isTelegramIntegrationEnabled(): boolean {
  return telegramIntegration.enabled;
}

export async function hydrateIntegrationState(): Promise<void> {
  const accounts = await loadAccounts();

  const waAccount = accounts.find(
    (account): account is WhatsAppAccount =>
      account.platform === 'whatsapp' && account.id === DEFAULT_ACCOUNT_ID && account.enabled,
  );
  whatsappConfigured = waAccount
    ? getEnabledWhatsAppDestinations(waAccount.config).length > 0
    : false;

  const tgAccount = accounts.find(
    (account) => account.platform === 'telegram' && account.id === DEFAULT_ACCOUNT_ID,
  );

  if (tgAccount?.platform === 'telegram' && tgAccount.enabled) {
    telegramIntegration = {
      enabled: Boolean(tgAccount.config.botToken && tgAccount.config.chatId),
      botToken: tgAccount.config.botToken,
      chatId: tgAccount.config.chatId,
    };
    return;
  }

  if (env.TELEGRAM_ENABLED && env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    telegramIntegration = {
      enabled: true,
      botToken: env.TELEGRAM_BOT_TOKEN,
      chatId: env.TELEGRAM_CHAT_ID,
    };
    return;
  }

  telegramIntegration = { enabled: false, botToken: '', chatId: '' };
}

export function invalidateIntegrationState(): void {
  whatsappConfigured = false;
  telegramIntegration = { enabled: false, botToken: '', chatId: '' };
}
