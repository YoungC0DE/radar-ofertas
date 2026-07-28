import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn.js';

type AlertTone = 'info' | 'success' | 'warning' | 'error';

type AlertProps = {
  readonly tone?: AlertTone;
  readonly children: ReactNode;
  readonly className?: string;
};

const toneConfig: Record<
  AlertTone,
  { icon: typeof Info; styles: string }
> = {
  info: {
    icon: Info,
    styles: 'border-primary/30 bg-primary/10 text-text-primary',
  },
  success: {
    icon: CheckCircle2,
    styles: 'border-success/30 bg-success/10 text-text-primary',
  },
  warning: {
    icon: TriangleAlert,
    styles: 'border-warning/30 bg-warning/10 text-text-primary',
  },
  error: {
    icon: AlertCircle,
    styles: 'border-error/30 bg-error/10 text-text-primary',
  },
};

export function Alert({ tone = 'info', children, className = '' }: AlertProps) {
  const { icon: Icon, styles } = toneConfig[tone];

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
        styles,
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
