import type { InputHTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/cn.js';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  readonly label?: string;
  readonly hint?: string;
  readonly error?: string;
  readonly icon?: ReactNode;
  readonly wrapperClassName?: string;
};

export function Input({
  label,
  hint,
  error,
  icon,
  className = '',
  wrapperClassName = '',
  id,
  ...props
}: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={cn('flex flex-col gap-2', wrapperClassName)}>
      {label ? (
        <label htmlFor={inputId} className="text-[13px] font-medium text-text-secondary">
          {label}
        </label>
      ) : null}
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
            {icon}
          </span>
        ) : null}
        <input
          id={inputId}
          className={cn(
            'h-10 w-full rounded-[10px] border border-border bg-bg-secondary px-3 text-sm text-text-primary',
            'placeholder:text-text-secondary/60 transition-colors duration-200',
            'hover:border-border/90 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25',
            'disabled:cursor-not-allowed disabled:opacity-50',
            icon ? 'pl-10' : '',
            error ? 'border-error focus:border-error focus:ring-error/25' : '',
            className,
          )}
          {...props}
        />
      </div>
      {error ? <p className="text-xs text-error">{error}</p> : null}
      {hint && !error ? <p className="text-xs text-text-secondary">{hint}</p> : null}
    </div>
  );
}

type TextareaProps = InputHTMLAttributes<HTMLTextAreaElement> & {
  readonly label?: string;
  readonly hint?: string;
};

export function Textarea({ label, hint, className = '', id, ...props }: TextareaProps) {
  const textareaId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <label htmlFor={textareaId} className="text-[13px] font-medium text-text-secondary">
          {label}
        </label>
      ) : null}
      <textarea
        id={textareaId}
        className={cn(
          'min-h-[120px] w-full resize-y rounded-[10px] border border-border bg-bg-secondary px-3 py-2.5 text-sm text-text-primary',
          'placeholder:text-text-secondary/60 transition-colors duration-200',
          'hover:border-border/90 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
      {hint ? <p className="text-xs text-text-secondary">{hint}</p> : null}
    </div>
  );
}

type SelectProps = InputHTMLAttributes<HTMLSelectElement> & {
  readonly label?: string;
  readonly children: ReactNode;
};

export function Select({ label, className = '', id, children, ...props }: SelectProps) {
  const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <label htmlFor={selectId} className="text-[13px] font-medium text-text-secondary">
          {label}
        </label>
      ) : null}
      <select
        id={selectId}
        className={cn(
          'h-10 w-full rounded-[10px] border border-border bg-bg-secondary pl-3 pr-9 text-sm text-text-primary',
          'transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
