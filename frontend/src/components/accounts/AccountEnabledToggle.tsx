type AccountEnabledToggleProps = {
  checked: boolean;
  disabled?: boolean;
  title?: string;
  onChange: (enabled: boolean) => void;
};

export function AccountEnabledToggle({
  checked,
  disabled = false,
  title,
  onChange,
}: AccountEnabledToggleProps) {
  return (
    <label className="relative inline-flex cursor-pointer select-none items-center" title={title}>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        className="relative inline-block h-6 w-[42px] rounded-full bg-border transition-colors after:absolute after:left-[3px] after:top-[3px] after:size-[18px] after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-success peer-checked:after:translate-x-[18px] peer-disabled:cursor-not-allowed peer-disabled:opacity-45"
        aria-hidden
      />
    </label>
  );
}
