import type { ReactNode } from 'react';

import { cn } from '../../lib/cn.js';

type CardProps = {
  readonly title?: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly headerAction?: ReactNode;
  readonly padding?: 'sm' | 'md' | 'lg';
};

const paddingStyles = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({
  title,
  description,
  children,
  className = '',
  headerAction,
  padding = 'md',
}: CardProps) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-border bg-bg-card shadow-[0_10px_30px_rgba(0,0,0,0.25)]',
        paddingStyles[padding],
        className,
      )}
    >
      {title || description || headerAction ? (
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title ? (
              <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm text-text-secondary">{description}</p>
            ) : null}
          </div>
          {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
