import { Moon, Sun } from 'lucide-react';

import { cn } from '../../lib/cn.js';
import { useTheme } from '../../theme/ThemeProvider.js';

type ThemeToggleProps = {
  readonly className?: string;
};

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { resolved, toggleTheme } = useTheme();
  const isDark = resolved === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'flex size-10 cursor-pointer items-center justify-center rounded-xl border border-border text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary',
        className,
      )}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
    >
      {isDark ? <Sun className="size-[18px]" aria-hidden /> : <Moon className="size-[18px]" aria-hidden />}
    </button>
  );
}
