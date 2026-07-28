import type { ReactNode } from 'react';

import { cn } from '../../lib/cn.js';

type TableProps = {
  readonly children: ReactNode;
  readonly className?: string;
};

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className={cn('overflow-x-auto rounded-2xl border border-border', className)}>
      <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { readonly children: ReactNode }) {
  return (
    <thead className="border-b border-border bg-bg-secondary/80">
      {children}
    </thead>
  );
}

export function TableBody({ children }: { readonly children: ReactNode }) {
  return <tbody className="divide-y divide-border/60">{children}</tbody>;
}

export function TableRow({
  children,
  className = '',
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <tr className={cn('transition-colors hover:bg-bg-secondary/40', className)}>
      {children}
    </tr>
  );
}

export function TableHeaderCell({
  children,
  className = '',
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left text-[13px] font-semibold uppercase tracking-wide text-text-secondary',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className = '',
  colSpan,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly colSpan?: number;
}) {
  return (
    <td className={cn('px-4 py-3.5 text-text-primary', className)} colSpan={colSpan}>
      {children}
    </td>
  );
}
