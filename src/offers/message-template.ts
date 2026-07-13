import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { getBrandName } from '../config/brand-config.js';
import type { OfferRecord } from './types.js';

export const MESSAGE_PLACEHOLDERS = [
  { key: 'store', label: 'Nome da loja', example: 'Radar Ofertas' },
  { key: 'name', label: 'Nome do produto', example: 'Fone Bluetooth XYZ' },
  { key: 'price', label: 'Preço formatado', example: 'R$ 89,90 (de R$ 129,90)' },
  { key: 'avalia', label: 'Avaliação', example: '4.8 ⭐' },
  { key: 'qty_sold', label: 'Quantidade vendida', example: '1.234 vendidos' },
  { key: 'top_sold', label: 'Ranking de vendas', example: '4º em Impressoras' },
  { key: 'product_link', label: 'Link de compra (afiliado)', example: 'https://mercadolivre.com/sec/abc123' },
] as const;

export type MessagePlaceholderKey = (typeof MESSAGE_PLACEHOLDERS)[number]['key'];

export type PlaceholderVisibility = Record<MessagePlaceholderKey, boolean>;

export const DEFAULT_PLACEHOLDER_VISIBILITY: PlaceholderVisibility = {
  store: true,
  name: true,
  price: true,
  avalia: true,
  qty_sold: true,
  top_sold: true,
  product_link: true,
};

export const DEFAULT_MESSAGE_TEMPLATE = `🔥 OFERTA IMPERDÍVEL! - 🏪 {{store}}

{{name}}

💰 {{price}}

⭐ {{avalia}}

📦 {{qty_sold}}{{top_sold}}

🛒 Compre aqui:
{{product_link}}`;

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatOfferPrice(offer: Pick<OfferRecord, 'price' | 'oldPrice'>): string {
  const oldPrice = offer.oldPrice;
  const showOldPrice = oldPrice != null && oldPrice > offer.price;
  if (showOldPrice) {
    return `${formatCurrency(offer.price)} (de ${formatCurrency(oldPrice)})`;
  }
  return formatCurrency(offer.price);
}

export function formatOfferRating(rating: number | null): string {
  if (rating === null) return 'Sem avaliação';
  return `${rating.toFixed(1)} ⭐`;
}

export function formatSoldQuantity(soldQuantity: number | null): string {
  if (soldQuantity === null) return 'Sem dados de vendas';
  return `${soldQuantity.toLocaleString('pt-BR')} vendidos`;
}

export function formatTopSoldLabel(salesRank: string | null): string {
  if (!salesRank?.trim()) return '';

  const raw = salesRank.trim();
  if (raw.includes(' - ')) return raw;

  const parts: string[] = [];

  const rankMatch = raw.match(
    /(\d{1,3}\s*[ºª°]\s*em\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9\s/&+-]*?)(?=Chegará|Disponível|$)/i,
  );
  if (rankMatch?.[1]) {
    parts.push(rankMatch[1].trim());
  }

  const shippingMatch = raw.match(/Chegará grátis\s+(?:amanhã|hoje|em\s+\d+\s+dias?)/i);
  if (shippingMatch) parts.push(shippingMatch[0].trim());

  const installmentMatch = raw.match(/Disponível em\s+\d+/i);
  if (installmentMatch) {
    parts.push(`${installmentMatch[0].trim()}x`);
  }

  if (parts.length > 0) return parts.join(' - ');

  return raw;
}

export interface MessageTemplateValues {
  store: string;
  name: string;
  price: string;
  avalia: string;
  qty_sold: string;
  top_sold: string;
  product_link: string;
}

export function buildTemplateValues(offer: OfferRecord): MessageTemplateValues {
  return {
    store: getBrandName(),
    name: offer.title,
    price: formatOfferPrice(offer),
    avalia: formatOfferRating(offer.rating),
    qty_sold: formatSoldQuantity(offer.soldQuantity),
    top_sold: formatTopSoldLabel(offer.salesRank),
    product_link: offer.affiliateLink ?? '',
  };
}

export function cleanupRenderedMessage(text: string): string {
  return text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (trimmed === '') return true;
      return /[A-Za-z0-9À-ÿ$]/.test(trimmed);
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function renderMessageTemplate(
  template: string,
  values: MessageTemplateValues,
  visibility: PlaceholderVisibility = DEFAULT_PLACEHOLDER_VISIBILITY,
): string {
  const rendered = template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    if (!(key in values)) return match;

    const placeholderKey = key as MessagePlaceholderKey;
    if (!visibility[placeholderKey]) return '';

    return values[placeholderKey];
  });

  return cleanupRenderedMessage(rendered);
}

export function formatOfferMessageFromTemplate(
  template: string,
  offer: OfferRecord,
  visibility: PlaceholderVisibility = DEFAULT_PLACEHOLDER_VISIBILITY,
): string {
  return renderMessageTemplate(template, buildTemplateValues(offer), visibility);
}

function templatePath(): string {
  return path.resolve(process.env.MESSAGE_TEMPLATE_PATH ?? './data/message-template.txt');
}

function templateConfigPath(): string {
  return path.resolve('./data/message-template-config.json');
}

function mergePlaceholderVisibility(
  override: Partial<PlaceholderVisibility> | undefined,
): PlaceholderVisibility {
  const merged = { ...DEFAULT_PLACEHOLDER_VISIBILITY };
  if (!override) return merged;

  for (const placeholder of MESSAGE_PLACEHOLDERS) {
    if (override[placeholder.key] !== undefined) {
      merged[placeholder.key] = override[placeholder.key]!;
    }
  }

  return merged;
}

export function loadPlaceholderVisibilitySync(): PlaceholderVisibility {
  try {
    const raw = readFileSync(templateConfigPath(), 'utf8');
    const parsed = JSON.parse(raw) as { placeholders?: Partial<PlaceholderVisibility> };
    return mergePlaceholderVisibility(parsed.placeholders);
  } catch {
    return { ...DEFAULT_PLACEHOLDER_VISIBILITY };
  }
}

export async function loadPlaceholderVisibility(): Promise<PlaceholderVisibility> {
  try {
    const raw = await fs.readFile(templateConfigPath(), 'utf8');
    const parsed = JSON.parse(raw) as { placeholders?: Partial<PlaceholderVisibility> };
    return mergePlaceholderVisibility(parsed.placeholders);
  } catch {
    return { ...DEFAULT_PLACEHOLDER_VISIBILITY };
  }
}

export async function savePlaceholderVisibility(visibility: PlaceholderVisibility): Promise<void> {
  const filePath = templateConfigPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(
    filePath,
    `${JSON.stringify({ placeholders: visibility }, null, 2)}\n`,
    'utf8',
  );
}

export function parsePlaceholderVisibilityFromForm(form: Record<string, string>): PlaceholderVisibility {
  const visibility = {} as PlaceholderVisibility;

  for (const placeholder of MESSAGE_PLACEHOLDERS) {
    const enabled = form[`placeholder_${placeholder.key}`] === '1';
    visibility[placeholder.key] = enabled;
  }

  return visibility;
}

export async function loadMessageTemplate(): Promise<string> {
  try {
    const content = await fs.readFile(templatePath(), 'utf8');
    const trimmed = content.trim();
    return trimmed || DEFAULT_MESSAGE_TEMPLATE;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return DEFAULT_MESSAGE_TEMPLATE;
    }
    throw error;
  }
}

export async function saveMessageTemplate(template: string): Promise<void> {
  const trimmed = template.trim();
  if (!trimmed) {
    throw new Error('O template não pode ficar vazio');
  }

  const filePath = templatePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${trimmed}\n`, 'utf8');
}

export function sampleTemplateValues(): MessageTemplateValues {
  return {
    store: getBrandName(),
    name: 'Fone Bluetooth XYZ Pro',
    price: 'R$ 89,90 (de R$ 129,90)',
    avalia: '4.8 ⭐',
    qty_sold: '1.234 vendidos',
    top_sold: '4º em Impressoras',
    product_link: 'https://mercadolivre.com/sec/exemplo123',
  };
}
