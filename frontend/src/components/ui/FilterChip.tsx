import type { ReactNode } from 'react';

import { cn } from '../../lib/cn.js';

type FilterChipProps = {
  readonly active: boolean;
  readonly children: string;
  readonly onClick: () => void;
};

export function FilterChip({ active, children, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-all duration-200',
        active
          ? 'border-primary/40 bg-primary/15 text-primary'
          : 'border-border bg-bg-card text-text-secondary hover:border-border/80 hover:bg-bg-secondary hover:text-text-primary',
      )}
    >
      {children}
    </button>
  );
}

type FilterGroupProps = {
  readonly children: ReactNode;
  readonly className?: string;
};

export function FilterGroup({ children, className = '' }: FilterGroupProps) {
  return <div className={cn('flex flex-wrap gap-2', className)}>{children}</div>;
}
