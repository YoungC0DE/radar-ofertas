import type { Account, WhatsAppAccount, TelegramAccount } from '../accounts/types.js';
import {
  getEnabledWhatsAppDestinations,
  listWhatsAppDestinations,
} from '../accounts/whatsapp-destinations.js';
import { resolveAccountAuthPath } from '../accounts/paths.js';
import type { ChannelPublisher } from './types.js';
import {
  connectWhatsApp,
  disconnectWhatsApp,
  isPlaceholderChannelId,
  requireWhatsAppSocket,
  sendOffer,
  setWhatsAppAuthPath,
  validateWhatsAppDestination,
  WhatsAppOwnedElsewhereError,
} from '../whatsapp/index.js';
import { resolveWhatsAppInvite } from '../whatsapp/invite.js';
import {
  getBotIdentity,
  sendOffer as sendTelegramOffer,
  validateTelegramChat,
} from '../telegram/index.js';
import type { OfferRecord } from '../offers/types.js';
import { logger } from '../utils/logger.js';

async function resolveDestinationJid(
  sock: Awaited<ReturnType<typeof connectWhatsApp>>,
  destination: ReturnType<typeof listWhatsAppDestinations>[number],
): Promise<string> {
  if (destination.jid.trim()) return destination.jid.trim();
  if (!destination.inviteLink?.trim()) {
    throw new Error(`Destino "${destination.label ?? destination.id}" sem JID ou link`);
  }

  const resolved = await resolveWhatsAppInvite(sock, destination.inviteLink);
  return resolved.jid;
}

export function createWhatsAppPublisher(account: WhatsAppAccount): ChannelPublisher {
  const { id, config } = account;

  return {
    channel: 'whatsapp',
    accountId: id,

    isEnabled: () => account.enabled,

    async verify() {
      setWhatsAppAuthPath(resolveAccountAuthPath(id, 'whatsapp'));

      const destinations = getEnabledWhatsAppDestinations(config);
      if (destinations.length === 0) {
        return {
          ok: false,
          detail:
            'Nenhum destino WhatsApp configurado — adicione um canal ou grupo em Configuração',
        };
      }

      try {
        const sock = await connectWhatsApp();
        const failures: string[] = [];
        let validCount = 0;

        for (const destination of destinations) {
          const jid = await resolveDestinationJid(sock, destination);
          if (isPlaceholderChannelId(jid)) {
            failures.push(`${destination.label ?? jid}: ID placeholder inválido`);
            continue;
          }

          const validation = await validateWhatsAppDestination(sock, jid, {
            inviteLink: destination.inviteLink,
          });
          if (!validation.valid) {
            failures.push(`${destination.label ?? jid}: ${validation.reason}`);
            continue;
          }

          validCount += 1;
        }

        if (validCount === 0) {
          return { ok: false, detail: failures.join(' · ') };
        }

        const detail =
          failures.length > 0
            ? `${validCount} destino(s) ativo(s); ignorando: ${failures.join(' · ')}`
            : `${validCount} destino(s) WhatsApp validado(s)`;

        return { ok: true, detail };
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
      const destinations = getEnabledWhatsAppDestinations(config);
      let lastMessageId = '';

      for (const destination of destinations) {
        try {
          const jid = await resolveDestinationJid(sock, destination);
          const validation = await validateWhatsAppDestination(sock, jid, {
            inviteLink: destination.inviteLink,
          });
          if (!validation.valid) {
            logger.warn(
              { jid, label: destination.label, reason: validation.reason },
              'Destino WhatsApp ignorado no envio',
            );
            continue;
          }

          const result = await sendOffer(sock, jid, offer.image, caption);
          lastMessageId = result.key.id ?? lastMessageId;
        } catch (error) {
          logger.warn(
            { error, label: destination.label, jid: destination.jid },
            'Falha ao publicar em destino WhatsApp',
          );
        }
      }

      if (!lastMessageId) {
        throw new Error('Nenhum destino WhatsApp aceitou o envio');
      }

      return { messageId: lastMessageId };
    },

    async publishText(text: string) {
      const sock = await requireWhatsAppSocket();
      const destinations = getEnabledWhatsAppDestinations(config);
      let lastMessageId = '';

      for (const destination of destinations) {
        try {
          const jid = await resolveDestinationJid(sock, destination);
          const validation = await validateWhatsAppDestination(sock, jid, {
            inviteLink: destination.inviteLink,
          });
          if (!validation.valid) {
            logger.warn(
              { jid, label: destination.label, reason: validation.reason },
              'Destino WhatsApp ignorado no envio',
            );
            continue;
          }

          const result = await sendOffer(sock, jid, null, text);
          lastMessageId = result.key.id ?? lastMessageId;
        } catch (error) {
          logger.warn(
            { error, label: destination.label, jid: destination.jid },
            'Falha ao publicar texto em destino WhatsApp',
          );
        }
      }

      if (!lastMessageId) {
        throw new Error('Nenhum destino WhatsApp aceitou o envio');
      }

      return { messageId: lastMessageId };
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
