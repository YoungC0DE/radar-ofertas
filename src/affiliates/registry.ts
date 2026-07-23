import type { AffiliatePlatformDefinition } from './types.js';

export const AFFILIATE_PLATFORM_DEFINITIONS: AffiliatePlatformDefinition[] = [
  {
    id: 'mercado_livre',
    label: 'Mercado Livre',
    status: 'active',
    description: 'Coleta de ofertas, links de afiliado e cupons do portal ML.',
  },
  {
    id: 'shopee',
    label: 'Shopee',
    status: 'coming_soon',
    description: 'Coleta e links de afiliado Shopee — em desenvolvimento.',
  },
  {
    id: 'amazon',
    label: 'Amazon',
    status: 'active',
    description:
      'Coleta de ofertas em browse nodes/buscas Amazon e links de afiliado amazon.com.br/dp/{ASIN}?tag=.',
  },
];

export function getAffiliatePlatformDefinition(
  platform: AffiliatePlatformDefinition['id'],
): AffiliatePlatformDefinition {
  const definition = AFFILIATE_PLATFORM_DEFINITIONS.find((item) => item.id === platform);
  if (!definition) {
    throw new Error(`Plataforma de afiliado desconhecida: ${platform}`);
  }
  return definition;
}
