import type { SerializedOffer } from '../../types/api.js';
import { cn } from '../../lib/cn.js';
import {
  detectOfferPlatform,
  offerPlatformLabel,
  offerPlatformShortLabel,
} from '../../utils/platform.js';

type PlatformBadgeProps = {
  offer: Pick<SerializedOffer, 'mercadoLivreId' | 'permalink'>;
};

const platformStyles = {
  amazon: 'border-warning/30 bg-warning/15 text-warning',
  mercado_livre: 'border-[#ffe600]/40 bg-[#ffe600]/20 text-[#f5c000]',
  unknown: 'border-border bg-bg-secondary text-text-secondary',
} as const;

export function PlatformBadge({ offer }: PlatformBadgeProps) {
  const platform = detectOfferPlatform(offer);
  const label = offerPlatformShortLabel(platform);
  const title = offerPlatformLabel(platform);
  const styleKey =
    platform === 'amazon' ? 'amazon' : platform === 'mercado_livre' ? 'mercado_livre' : 'unknown';

  return (
    <span
      className={cn(
        'inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[0.72rem] font-semibold',
        platformStyles[styleKey],
      )}
      title={title}
    >
      {label}
    </span>
  );
}
