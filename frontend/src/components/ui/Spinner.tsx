import { Loader2 } from 'lucide-react';

import { cn } from '../../lib/cn.js';

type SpinnerProps = {
  readonly label?: string;
  readonly className?: string;
  readonly fullPage?: boolean;
};

export function Spinner({
  label = 'Carregando…',
  className = '',
  fullPage = false,
}: SpinnerProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-sm text-text-secondary',
        fullPage ? 'min-h-[40vh]' : 'py-12',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
