import { cn } from '../../lib/cn.js';

type BadgeTone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'active'
  | 'inactive'
  | 'pending'
  | 'error';

type BadgeProps = {
  readonly tone?: BadgeTone;
  readonly children: string;
  readonly className?: string;
};

const toneStyles: Record<BadgeTone, string> = {
  neutral: 'bg-bg-secondary text-text-secondary border-border',
  success: 'bg-success/15 text-success border-success/25',
  warning: 'bg-warning/15 text-warning border-warning/25',
  danger: 'bg-error/15 text-error border-error/25',
  info: 'bg-primary/15 text-primary border-primary/25',
  active: 'bg-success/15 text-success border-success/25',
  inactive: 'bg-bg-secondary text-text-secondary border-border',
  pending: 'bg-warning/15 text-warning border-warning/25',
  error: 'bg-error/15 text-error border-error/25',
};

export function Badge({ tone = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium',
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
