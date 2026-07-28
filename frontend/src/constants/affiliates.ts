export type AffiliatePlatformStatus = 'active' | 'links_only' | 'coming_soon';

export type AffiliatePlatformDefinition = {
  id: 'mercado_livre' | 'shopee' | 'amazon';
  label: string;
  status: AffiliatePlatformStatus;
  description: string;
};

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

export const EXAMPLE_AMAZON_ASIN = 'B0DNHGQHMY';

export function affiliateStatusLabel(status: AffiliatePlatformStatus): string {
  if (status === 'active') return 'Ativo';
  if (status === 'links_only') return 'Links';
  return 'Em breve';
}

export function buildExampleAmazonLink(input: {
  baseUrl: string;
  affiliateLinkPrefix: string;
  storeId: string;
}): string {
  const prefix = input.affiliateLinkPrefix.trim();
  if (prefix) {
    return `${prefix.replace(/\/$/, '')}/${EXAMPLE_AMAZON_ASIN}`;
  }
  const base = input.baseUrl.replace(/\/$/, '');
  const tag = input.storeId.trim();
  return tag
    ? `${base}/dp/${EXAMPLE_AMAZON_ASIN}?tag=${encodeURIComponent(tag)}`
    : `${base}/dp/${EXAMPLE_AMAZON_ASIN}`;
}

export function endHourForForm(end: number): number {
  return end === 0 ? 24 : end;
}
