import { env } from '../config/env.js';
import type { OfferRecord } from '../offers/types.js';
import { getBotIdentity, hasTelegramCredentials, sendOffer, validateTelegramChat } from '../telegram/index.js';
import type { ChannelPublisher } from './types.js';

export const telegramPublisher: ChannelPublisher = {
  channel: 'telegram',
  accountId: 'default',

  isEnabled: () => env.TELEGRAM_ENABLED,

  async verify() {
    if (!hasTelegramCredentials()) {
      return {
        ok: false,
        detail: 'TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID vazios — configure no .env',
      };
    }

    try {
      const bot = await getBotIdentity();
      const chat = await validateTelegramChat(env.TELEGRAM_CHAT_ID);

      if (!chat.valid) {
        return { ok: false, detail: `Chat inválido: ${chat.reason}` };
      }

      return {
        ok: true,
        detail: `Bot @${bot.username ?? bot.id} publicando em "${chat.name ?? env.TELEGRAM_CHAT_ID}"`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, detail: message };
    }
  },

  async publish(offer: OfferRecord, caption: string) {
    // Diferente do WhatsApp, a Bot API é stateless: não há sessão para manter viva,
    // cada envio é uma chamada HTTP autenticada pelo token.
    const result = await sendOffer(env.TELEGRAM_CHAT_ID, offer.image, caption);
    return { messageId: String(result.message_id) };
  },

  async publishText(text: string) {
    const result = await sendOffer(env.TELEGRAM_CHAT_ID, null, text);
    return { messageId: String(result.message_id) };
  },
};
