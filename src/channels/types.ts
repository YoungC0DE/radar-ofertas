import type { OfferRecord } from '../offers/types.js';

export const CHANNELS = ['whatsapp', 'telegram'] as const;

export type Channel = (typeof CHANNELS)[number];

export function isChannel(value: string): value is Channel {
  return (CHANNELS as readonly string[]).includes(value);
}

export const CHANNEL_LABELS: Record<Channel, string> = {
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
};

export interface ChannelVerifyResult {
  ok: boolean;
  detail: string;
  /**
   * O canal só admite um processo dono da conexão e outro já assumiu (WhatsApp).
   * Não é erro de configuração: o worker duplicado encerra em silêncio (exit 0)
   * em vez de falhar e ser reiniciado em loop pelo Docker.
   */
  duplicate?: boolean;
}

/**
 * Contrato de um canal de publicação. Cada canal roda no seu próprio processo,
 * com sua fila e seu ritmo — o worker é genérico e só conhece esta interface.
 *
 * Para adicionar um canal: implemente isto, registre em channels/index.ts e suba
 * um processo com runChannelWorker(publisher).
 */
export interface ChannelPublisher {
  readonly channel: Channel;

  /** O canal está ligado no .env? Um worker de canal desligado encerra no boot. */
  isEnabled(): boolean;

  /** Credenciais e destino conferem? Roda uma vez no boot do worker. */
  verify(): Promise<ChannelVerifyResult>;

  /** Publica a oferta já formatada. Devolve o id da mensagem no canal. */
  publish(offer: OfferRecord, caption: string): Promise<{ messageId: string }>;

  /** Publica texto livre (mensagens automáticas). */
  publishText(text: string): Promise<{ messageId: string }>;

  /** Libera recursos no shutdown (sessões, sockets). Opcional. */
  shutdown?(): Promise<void>;
}
