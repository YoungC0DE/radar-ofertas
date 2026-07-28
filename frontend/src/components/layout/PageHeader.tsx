import type { ReactNode } from 'react';

type PageHeaderProps = {
  readonly title?: string;
  readonly subtitle?: string;
  readonly actions?: ReactNode;
};

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  if (!title && !subtitle && !actions) return null;

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {title ? (
          <h1 className="text-[28px] font-bold leading-tight text-text-primary">{title}</h1>
        ) : null}
        {subtitle ? (
          <p className="mt-2 text-sm text-text-secondary">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
