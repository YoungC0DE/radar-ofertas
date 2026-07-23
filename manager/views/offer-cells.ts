import { CHANNEL_LABELS } from '../../src/channels/types.js';
import type { DeliveryRecord, OfferRecord } from '../../src/offers/types.js';
import {
  detectOfferPlatform,
  offerPlatformLabel,
  offerPlatformShortLabel,
} from '../../src/offers/platform.js';
import { escapeHtml } from './helpers.js';

/** Badges de destino: um por canal que recebe a oferta, com o status da entrega. */
export function renderDestino(deliveries: DeliveryRecord[] | undefined): string {
  if (!deliveries || deliveries.length === 0) {
    return '<span class="meta">—</span>';
  }

  return deliveries
    .map((delivery) => {
      const label = CHANNEL_LABELS[delivery.channel] ?? delivery.channel;
      const { cls, glyph, title } = delivery.sentAt
        ? { cls: 'dest-sent', glyph: '✓', title: 'Enviado' }
        : delivery.error
          ? { cls: 'dest-failed', glyph: '✗', title: `Falhou: ${delivery.error}` }
          : { cls: 'dest-pending', glyph: '•', title: 'Pendente' };
      return `<span class="dest-badge ${cls}" title="${escapeHtml(title)}">${escapeHtml(label)} ${glyph}</span>`;
    })
    .join(' ');
}

export function renderPlatformBadge(offer: OfferRecord): string {
  const platform = detectOfferPlatform(offer);
  const label = offerPlatformShortLabel(platform);
  const title = offerPlatformLabel(platform);
  const cls =
    platform === 'amazon'
      ? 'platform-amazon'
      : platform === 'mercado_livre'
        ? 'platform-ml'
        : 'platform-unknown';
  return `<span class="platform-badge ${cls}" title="${escapeHtml(title)}">${escapeHtml(label)}</span>`;
}
