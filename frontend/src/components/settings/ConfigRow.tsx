import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '../ui/Button.js';

type ConfigRowProps = {
  readonly label: string;
  readonly value: ReactNode;
  readonly hint?: string;
};

export function ConfigRow({ label, value, hint }: ConfigRowProps) {
  return (
    <div className="grid gap-1 border-b border-border/50 px-5 py-4 first:pt-5 last:border-0 last:pb-5 sm:grid-cols-[180px_1fr] sm:gap-4 sm:px-6">
      <div className="text-[13px] font-medium text-text-secondary">{label}</div>
      <div>
        <div className="text-sm text-text-primary">{value}</div>
        {hint ? <div className="mt-1 text-xs text-text-secondary">{hint}</div> : null}
      </div>
    </div>
  );
}

type EditButtonProps = {
  readonly title: string;
  readonly onClick: () => void;
};

export function EditButton({ title, onClick }: EditButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="!px-2"
    >
      <Pencil className="size-3.5" />
    </Button>
  );
}
