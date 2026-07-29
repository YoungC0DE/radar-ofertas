import type { SerializedDelivery, SerializedOffer } from '../../types/api.js';
import { Badge } from '../ui/Badge.js';

const CHANNEL_LABELS: Record<SerializedDelivery['channel'], string> = {
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
};

const grayBadgeClass =
  'inline-block whitespace-nowrap rounded-full border border-border bg-bg-secondary px-2 py-0.5 text-[0.72rem] font-semibold text-text-secondary';

type DestinationBadgesProps = {
  deliveries: SerializedDelivery[] | undefined;
};

export function DestinationBadges({ deliveries }: DestinationBadgesProps) {
  if (!deliveries || deliveries.length === 0) {
    return <span className="text-sm text-text-secondary">—</span>;
  }

  const channels = [...new Set(deliveries.map((delivery) => delivery.channel))];

  return (
    <div className="flex flex-wrap gap-1">
      {channels.map((channel) => (
        <span key={channel} className={grayBadgeClass}>
          {CHANNEL_LABELS[channel] ?? channel}
        </span>
      ))}
    </div>
  );
}

export type OfferListStatus = 'pending' | 'error' | 'sent';

export function resolveOfferListStatus(
  offer: Pick<SerializedOffer, 'sentAt'>,
  deliveries: SerializedDelivery[] | undefined,
): OfferListStatus {
  if (offer.sentAt) return 'sent';
  const hasError = (deliveries ?? []).some(
    (delivery) => delivery.error != null && delivery.sentAt == null,
  );
  if (hasError) return 'error';
  return 'pending';
}

type OfferStatusBadgeProps = {
  status: OfferListStatus;
  errorMessage?: string | null;
};

export function OfferStatusBadge({ status, errorMessage }: OfferStatusBadgeProps) {
  if (status === 'sent') {
    return <Badge tone="success">Enviado</Badge>;
  }
  if (status === 'error') {
    return (
      <span title={errorMessage?.trim() || 'Falha no envio'}>
        <Badge tone="error">Erro</Badge>
      </span>
    );
  }
  return <Badge tone="pending">Pendente</Badge>;
}

export function collectDeliveryErrors(
  deliveries: SerializedDelivery[] | undefined,
): string | null {
  const messages = (deliveries ?? [])
    .filter((delivery) => delivery.error != null && delivery.sentAt == null)
    .map((delivery) => delivery.error!.trim())
    .filter(Boolean);
  if (messages.length === 0) return null;
  return [...new Set(messages)].join(' · ');
}
