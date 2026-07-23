import { env } from '../config/env.js';
import { resolveAccountAuthPath } from './paths.js';
import {
  DEFAULT_ACCOUNT_ID,
  type Account,
  type MercadoLivreAccount,
  type TelegramAccount,
  type WhatsAppAccount,
} from './types.js';

/** Contas derivadas do .env — compatibilidade com instalação single-account. */
export function buildDefaultAccountsFromEnv(): Account[] {
  const accounts: Account[] = [];

  const whatsapp: WhatsAppAccount = {
    id: DEFAULT_ACCOUNT_ID,
    platform: 'whatsapp',
    label: 'WhatsApp principal',
    enabled: true,
    config: {
      channelId: env.WHATSAPP_CHANNEL_ID,
      authPath: resolveAccountAuthPath(DEFAULT_ACCOUNT_ID, 'whatsapp'),
    },
  };
  accounts.push(whatsapp);

  if (env.TELEGRAM_ENABLED) {
    const telegram: TelegramAccount = {
      id: DEFAULT_ACCOUNT_ID,
      platform: 'telegram',
      label: 'Telegram principal',
      enabled: true,
      config: {
        botToken: env.TELEGRAM_BOT_TOKEN,
        chatId: env.TELEGRAM_CHAT_ID,
      },
    };
    accounts.push(telegram);
  }

  const mercadoLivre: MercadoLivreAccount = {
    id: DEFAULT_ACCOUNT_ID,
    platform: 'mercado_livre',
    label: 'Afiliado ML principal',
    enabled: true,
    config: {
      authPath: resolveAccountAuthPath(DEFAULT_ACCOUNT_ID, 'mercado_livre'),
    },
  };
  accounts.push(mercadoLivre);

  return accounts;
}
