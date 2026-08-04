import { cn } from '../../lib/cn.js';
import { AccountEnabledToggle } from '../accounts/AccountEnabledToggle.js';
import { Badge } from '../ui/Badge.js';
import { Button } from '../ui/Button.js';

type CollectionPlatformCardProps = {
  readonly label: string;
  readonly icon: string;
  readonly iconClassName: string;
  readonly detail: string;
  readonly secondaryDetail?: string;
  readonly enabled: boolean;
  readonly toggleDisabled?: boolean;
  readonly toggleTitle?: string;
  readonly onToggle: () => void;
  readonly onConfigure?: () => void;
  readonly onLogin?: () => void;
};

export function CollectionPlatformCard({
  label,
  icon,
  iconClassName,
  detail,
  secondaryDetail,
  enabled,
  toggleDisabled = false,
  toggleTitle,
  onToggle,
  onConfigure,
  onLogin,
}: CollectionPlatformCardProps) {
  return (
    <article
      className={cn(
        'flex flex-col gap-4 rounded-2xl border border-border bg-bg-card p-5 transition-opacity',
        !enabled && 'opacity-70',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl text-xl text-white',
            iconClassName,
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-semibold text-text-primary">{label}</div>
            <Badge tone={enabled ? 'success' : 'neutral'}>
              {enabled ? 'Ativo' : 'Desativado'}
            </Badge>
          </div>
          <div className="mt-1 text-sm text-text-secondary">{detail}</div>
          {secondaryDetail ? (
            <div className="mt-1 text-sm text-text-secondary">{secondaryDetail}</div>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <AccountEnabledToggle
          checked={enabled}
          disabled={toggleDisabled}
          title={toggleTitle}
          onChange={() => onToggle()}
        />
        {onConfigure ? (
          <Button variant="secondary" onClick={onConfigure}>
            Configurar
          </Button>
        ) : null}
        {onLogin ? (
          <Button onClick={onLogin}>Logar</Button>
        ) : null}
      </div>
    </article>
  );
}
