import type { ClassifiedMlScrapeEntry } from '../../types/api.js';
import { cn } from '../../lib/cn.js';
import { formatLogTime } from '../../utils/formatLogTime.js';

type MlScrapeLineProps = {
  entry: ClassifiedMlScrapeEntry;
  onSelect: (meta: Record<string, unknown>) => void;
};

const statusBadgeStyles: Record<string, string> = {
  'ml-status-ok': 'bg-success/15 text-success',
  'ml-status-warn': 'bg-warning/15 text-warning',
  'ml-status-error': 'bg-error/15 text-error',
};

export function MlScrapeLine({ entry, onSelect }: MlScrapeLineProps) {
  return (
    <div
      className={cn(
        'grid cursor-pointer grid-cols-[auto_auto_auto_1fr] items-baseline gap-2 border-b border-[#30363d]/60 py-1.5 hover:bg-[#ffe600]/5',
        entry.statusClass,
      )}
      role="button"
      tabIndex={0}
      title={entry.detail}
      onClick={() => onSelect(entry.meta)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(entry.meta);
        }
      }}
    >
      <span className="whitespace-nowrap text-[0.7rem] text-[#8b949e]">
        {formatLogTime(entry.timestamp)}
      </span>
      <span
        className={cn(
          'whitespace-nowrap rounded px-1.5 py-0.5 text-[0.62rem] font-bold tracking-wide',
          statusBadgeStyles[entry.statusClass] ?? 'bg-bg-secondary text-text-secondary',
        )}
      >
        {entry.status}
      </span>
      <span className="whitespace-nowrap text-[0.65rem] font-bold text-[#58a6ff]">{entry.method}</span>
      <span className="min-w-0 truncate text-[#c9d1d9]">{entry.detail}</span>
    </div>
  );
}
