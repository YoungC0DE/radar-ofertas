import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn.js';

type EmptyStateProps = {
  readonly icon?: LucideIcon;
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-bg-card/50 px-8 py-16 text-center',
        className,
      )}
    >
      {Icon ? (
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-bg-secondary text-text-secondary">
          <Icon className="size-6" aria-hidden />
        </div>
      ) : null}
      <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-text-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
