import type { SerializedDelivery } from '../../types/api.js';
import { cn } from '../../lib/cn.js';
import { Badge } from '../ui/Badge.js';

const CHANNEL_LABELS: Record<SerializedDelivery['channel'], string> = {
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
};

const destToneStyles = {
  sent: 'border-success/30 bg-success/15 text-success',
  pending: 'border-warning/30 bg-warning/15 text-warning',
  failed: 'border-error/30 bg-error/15 text-error',
} as const;

type DestinationBadgesProps = {
  deliveries: SerializedDelivery[] | undefined;
};

export function DestinationBadges({ deliveries }: DestinationBadgesProps) {
  if (!deliveries || deliveries.length === 0) {
    return <span className="text-sm text-text-secondary">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {deliveries.map((delivery) => {
        const label = CHANNEL_LABELS[delivery.channel] ?? delivery.channel;
        const tone = delivery.sentAt ? 'sent' : delivery.error ? 'failed' : 'pending';
        const glyph = delivery.sentAt ? '✓' : delivery.error ? '✗' : '•';
        const title = delivery.sentAt
          ? 'Enviado'
          : delivery.error
            ? `Falhou: ${delivery.error}`
            : 'Pendente';

        return (
          <span
            key={delivery.id}
            className={cn(
              'inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[0.72rem] font-semibold',
              destToneStyles[tone],
            )}
            title={title}
          >
            {label} {glyph}
          </span>
        );
      })}
    </div>
  );
}

type OfferStatusBadgeProps = {
  sentAt: string | null;
};

export function OfferStatusBadge({ sentAt }: OfferStatusBadgeProps) {
  return sentAt ? <Badge tone="success">Enviada</Badge> : <Badge tone="warning">Pendente</Badge>;
}
