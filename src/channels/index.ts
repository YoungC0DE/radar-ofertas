import { telegramPublisher } from './telegram-publisher.js';
import { CHANNELS, type Channel, type ChannelPublisher } from './types.js';
import { whatsappPublisher } from './whatsapp-publisher.js';

export { CHANNELS, CHANNEL_LABELS, isChannel } from './types.js';
export type { Channel, ChannelPublisher, ChannelVerifyResult } from './types.js';

const PUBLISHERS: Record<Channel, ChannelPublisher> = {
  whatsapp: whatsappPublisher,
  telegram: telegramPublisher,
};

export function getPublisher(channel: Channel): ChannelPublisher {
  return PUBLISHERS[channel];
}

/**
 * Canais ligados no .env. É esta lista que o collector usa para o fan-out —
 * um canal desligado nunca chega a ter oferta enfileirada.
 */
export function getEnabledChannels(): Channel[] {
  return CHANNELS.filter((channel) => PUBLISHERS[channel].isEnabled());
}

export function isChannelEnabled(channel: Channel): boolean {
  return PUBLISHERS[channel].isEnabled();
}
