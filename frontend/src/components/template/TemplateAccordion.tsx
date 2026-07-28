import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

type TemplateAccordionProps = {
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function TemplateAccordion({
  title,
  description,
  defaultOpen = false,
  children,
}: TemplateAccordionProps) {
  return (
    <details
      className="group overflow-hidden rounded-2xl border border-border bg-bg-card shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="text-base font-semibold text-text-primary">{title}</span>
        <ChevronDown
          className="size-5 shrink-0 text-text-secondary transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-border px-6 pb-6 pt-4">
        <p className="mb-5 text-sm text-text-secondary">{description}</p>
        {children}
      </div>
    </details>
  );
}
