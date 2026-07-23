import type { Account, WhatsAppAccount, TelegramAccount } from '../accounts/types.js';
import type { ChannelPublisher } from './types.js';
import {
  connectWhatsApp,
  disconnectWhatsApp,
  isPlaceholderChannelId,
  requireWhatsAppSocket,
  sendOffer,
  validateWhatsAppChannel,
  WhatsAppOwnedElsewhereError,
} from '../whatsapp/index.js';
import {
  getBotIdentity,
  sendOffer as sendTelegramOffer,
  validateTelegramChat,
} from '../telegram/index.js';
import type { OfferRecord } from '../offers/types.js';

export function createWhatsAppPublisher(account: WhatsAppAccount): ChannelPublisher {
  const { id, config } = account;

  return {
    channel: 'whatsapp',
    accountId: id,

    isEnabled: () => account.enabled,

    async verify() {
      if (isPlaceholderChannelId(config.channelId)) {
        return {
          ok: false,
          detail: 'WHATSAPP_CHANNEL_ID é placeholder — rode npm run wa:channel com o link do seu canal',
        };
      }

      try {
        const sock = await connectWhatsApp();
        const channel = await validateWhatsAppChannel(sock, config.channelId);

        if (!channel.valid) {
          return {
            ok: false,
            detail: `Canal inválido (${channel.reason}) — rode npm run wa:channel para obter o JID correto`,
          };
        }

        return { ok: true, detail: `Canal "${channel.name ?? config.channelId}" validado` };
      } catch (error) {
        if (error instanceof WhatsAppOwnedElsewhereError) {
          return {
            ok: false,
            duplicate: true,
            detail: 'A sessão do WhatsApp já está ativa em outro processo',
          };
        }
        throw error;
      }
    },

    async publish(offer: OfferRecord, caption: string) {
      const sock = await requireWhatsAppSocket();
      const result = await sendOffer(sock, config.channelId, offer.image, caption);
      return { messageId: result.key.id ?? '' };
    },

    async publishText(text: string) {
      const sock = await requireWhatsAppSocket();
      const result = await sendOffer(sock, config.channelId, null, text);
      return { messageId: result.key.id ?? '' };
    },

    async shutdown() {
      await disconnectWhatsApp().catch(() => {});
    },
  };
}

export function createTelegramPublisher(account: TelegramAccount): ChannelPublisher {
  const { id, config } = account;

  return {
    channel: 'telegram',
    accountId: id,

    isEnabled: () => account.enabled,

    async verify() {
      if (!config.botToken || !config.chatId) {
        return {
          ok: false,
          detail: 'TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID vazios — configure no .env',
        };
      }

      try {
        const bot = await getBotIdentity();
        const chat = await validateTelegramChat(config.chatId);

        if (!chat.valid) {
          return { ok: false, detail: `Chat inválido: ${chat.reason}` };
        }

        return {
          ok: true,
          detail: `Bot @${bot.username ?? bot.id} publicando em "${chat.name ?? config.chatId}"`,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, detail: message };
      }
    },

    async publish(offer: OfferRecord, caption: string) {
      const result = await sendTelegramOffer(config.chatId, offer.image, caption);
      return { messageId: String(result.message_id) };
    },

    async publishText(text: string) {
      const result = await sendTelegramOffer(config.chatId, null, text);
      return { messageId: String(result.message_id) };
    },
  };
}

export function createPublisher(account: Account): ChannelPublisher {
  switch (account.platform) {
    case 'whatsapp':
      return createWhatsAppPublisher(account);
    case 'telegram':
      return createTelegramPublisher(account);
    case 'mercado_livre':
      throw new Error('Mercado Livre não é um canal de publicação');
  }
}
