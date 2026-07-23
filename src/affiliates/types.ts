/** Plataformas de afiliado/coleta — distinto de canais de publicação (WhatsApp/Telegram). */
export const AFFILIATE_PLATFORMS = ['mercado_livre', 'shopee', 'amazon'] as const;

export type AffiliatePlatform = (typeof AFFILIATE_PLATFORMS)[number];

export type AffiliatePlatformStatus = 'active' | 'links_only' | 'coming_soon';

export interface AffiliatePlatformDefinition {
  id: AffiliatePlatform;
  label: string;
  status: AffiliatePlatformStatus;
  description: string;
}

export function isAffiliatePlatform(value: string): value is AffiliatePlatform {
  return (AFFILIATE_PLATFORMS as readonly string[]).includes(value);
}

export function affiliatePlatformLabel(platform: AffiliatePlatform): string {
  if (platform === 'mercado_livre') return 'Mercado Livre';
  if (platform === 'shopee') return 'Shopee';
  return 'Amazon';
}
