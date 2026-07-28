import type { ClassifiedLogEntry } from '../../types/api.js';
import { cn } from '../../lib/cn.js';
import { formatLogTime } from '../../utils/formatLogTime.js';

type AuditLogLineProps = {
  entry: ClassifiedLogEntry;
  hidden: boolean;
  onSelect: (meta: Record<string, unknown>) => void;
};

const levelChipText: Record<string, string> = {
  'audit-chip-info': 'text-[#58a6ff]',
  'audit-chip-ok': 'text-success',
  'audit-chip-warn': 'text-warning',
  'audit-chip-error': 'text-error',
  'audit-chip-sec': 'text-violet-300',
};

export function AuditLogLine({ entry, hidden, onSelect }: AuditLogLineProps) {
  const msgColor =
    entry.level === 'error' || entry.level === 'fatal'
      ? 'text-[#ffa198]'
      : entry.level === 'warn'
        ? 'text-[#e3b341]'
        : 'text-[#c9d1d9]';

  return (
    <div
      className={cn('mb-0.5 cursor-pointer whitespace-nowrap', hidden && 'hidden')}
      role="button"
      tabIndex={0}
      title="Clique para ver detalhes"
      onClick={() => onSelect(entry.meta)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(entry.meta);
        }
      }}
    >
      <span className="mr-2.5 text-[#8b949e]">{formatLogTime(entry.timestamp)}</span>
      <span
        className={cn(
          'mr-2.5 inline-block min-w-[58px] font-bold',
          levelChipText[entry.chipClass] ?? 'text-[#58a6ff]',
        )}
      >
        [{entry.chip}]
      </span>
      <span className="mr-2 font-bold text-success">{entry.source}</span>
      <span className="mr-2 text-[#484f58]">›</span>
      <span className="mr-2.5 text-[#79c0ff]">{entry.module}</span>
      <span className="mr-2.5 inline-block min-w-[42px] font-bold text-[#f0f6fc]">{entry.action}</span>
      <span className={cn('mr-3', msgColor)}>{entry.message}</span>
      {entry.metaTrail ? <span className="text-[#6e7681]">{entry.metaTrail}</span> : null}
    </div>
  );
}
