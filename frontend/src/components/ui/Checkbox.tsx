import { Check, Minus } from 'lucide-react';
import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib/cn.js';

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  readonly label?: ReactNode;
  readonly className?: string;
  readonly labelClassName?: string;
  readonly indeterminate?: boolean;
};

export function Checkbox({
  label,
  className,
  labelClassName,
  indeterminate = false,
  disabled,
  id,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'group inline-flex cursor-pointer select-none items-center gap-2.5',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <span className="relative inline-flex shrink-0">
        <input
          id={inputId}
          type="checkbox"
          className="peer sr-only"
          disabled={disabled}
          ref={(node) => {
            if (node) node.indeterminate = indeterminate;
          }}
          {...props}
        />
        <span
          className={cn(
            'flex size-[18px] items-center justify-center rounded-[6px] border border-border bg-bg-secondary',
            'transition-all duration-200',
            'group-hover:border-primary/45 group-hover:bg-bg-card',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-primary/25 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg-primary',
            'peer-checked:border-primary peer-checked:bg-primary',
            'peer-disabled:pointer-events-none',
            indeterminate && 'border-primary bg-primary',
          )}
          aria-hidden
        >
          <Check
            className={cn(
              'size-3 text-white opacity-0 transition-opacity duration-150',
              'group-has-[input:checked]:opacity-100',
              indeterminate && '!opacity-0',
            )}
            strokeWidth={3}
          />
          <Minus
            className={cn(
              'absolute size-3 text-white opacity-0 transition-opacity duration-150',
              indeterminate && 'opacity-100',
            )}
            strokeWidth={3}
          />
        </span>
      </span>
      {label ? (
        <span className={cn('text-sm text-text-primary', labelClassName)}>{label}</span>
      ) : null}
    </label>
  );
}
