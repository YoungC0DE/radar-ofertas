import type { SerializedOffer } from '../../types/api.js';
import {
  detectOfferPlatform,
  offerPlatformShortLabel,
} from '../../utils/platform.js';

type PlatformBadgeProps = {
  offer: Pick<SerializedOffer, 'mercadoLivreId' | 'permalink'>;
};

const grayBadgeClass =
  'inline-block whitespace-nowrap rounded-full border border-border bg-bg-secondary px-2 py-0.5 text-[0.72rem] font-semibold text-text-secondary';

export function PlatformBadge({ offer }: PlatformBadgeProps) {
  const platform = detectOfferPlatform(offer);
  const label = offerPlatformShortLabel(platform);

  return <span className={grayBadgeClass}>{label}</span>;
}
