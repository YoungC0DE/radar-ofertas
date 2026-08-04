import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';

import type { ClassifiedLogEntry } from '../../types/api.js';
import { LOG_LEVEL_FILTERS } from '../../constants/logs.js';
import { cn } from '../../lib/cn.js';
import { Checkbox } from '../ui/Checkbox.js';
import { AuditLogLine } from './AuditLogLine.js';

type AuditConsoleProps = {
  logs: ClassifiedLogEntry[];
  total: number;
  transportLabel: string;
  emptyMessage: string;
  isPaused: boolean;
  autoScroll: boolean;
  onPauseChange: (paused: boolean) => void;
  onAutoScrollChange: (enabled: boolean) => void;
  onClear: () => void;
  onSelectMeta: (meta: Record<string, unknown>) => void;
};

const auditChipStyles: Record<string, string> = {
  'audit-chip-info': 'border-[#58a6ff]/35 bg-[#58a6ff]/15 text-[#58a6ff]',
  'audit-chip-ok': 'border-success/35 bg-success/15 text-success',
  'audit-chip-warn': 'border-warning/35 bg-warning/15 text-warning',
  'audit-chip-error': 'border-error/35 bg-error/15 text-error',
  'audit-chip-sec': 'border-violet-400/35 bg-violet-400/15 text-violet-300',
};

export function AuditConsole({
  logs,
  total,
  transportLabel,
  emptyMessage,
  isPaused,
  autoScroll,
  onPauseChange,
  onAutoScrollChange,
  onClear,
  onSelectMeta,
}: AuditConsoleProps) {
  const outputWrapRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLevels, setActiveLevels] = useState<Set<string>>(
    () => new Set(['info', 'debug', 'warn', 'error', 'fatal', 'trace']),
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const visibleCount = useMemo(() => {
    return logs.filter((entry) => {
      const levelOk = activeLevels.has(entry.level);
      const searchOk = !normalizedQuery || entry.searchBlob.includes(normalizedQuery);
      return levelOk && searchOk;
    }).length;
  }, [activeLevels, logs, normalizedQuery]);

  useEffect(() => {
    if (!autoScroll || !outputWrapRef.current) return;
    outputWrapRef.current.scrollTop = outputWrapRef.current.scrollHeight;
  }, [autoScroll, logs.length]);

  function toggleLevelChip(levels: readonly string[]) {
    setActiveLevels((current) => {
      const next = new Set(current);
      const allActive = levels.every((level) => next.has(level));
      for (const level of levels) {
        if (allActive) next.delete(level);
        else next.add(level);
      }
      return next;
    });
  }

  function isChipActive(levels: readonly string[]): boolean {
    return levels.every((level) => activeLevels.has(level));
  }

  return (
    <section className="w-full overflow-hidden rounded-xl border border-[#30363d] bg-[#161b22] shadow-[0_8px_24px_rgba(1,4,9,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#30363d] bg-gradient-to-b from-[#1c2128] to-[#161b22] px-4 py-3.5">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h2 className="m-0 whitespace-nowrap text-xs font-bold tracking-widest text-[#f0f6fc]">
            CONSOLE DE AUDITORIA
          </h2>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-bold tracking-wider',
              isPaused
                ? 'border-[#8b949e]/35 bg-[#8b949e]/10 text-[#8b949e]'
                : 'border-success/35 bg-success/10 text-success',
            )}
          >
            <span
              className={cn(
                'size-[7px] rounded-full',
                isPaused ? 'bg-[#8b949e]' : 'bg-success shadow-[0_0_8px_rgba(63,185,80,0.8)]',
              )}
            />
            {isPaused ? 'PAUSADO' : 'AO VIVO'}
          </span>
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2.5">
          <label className="flex min-w-[220px] max-w-[360px] flex-1 items-center gap-2 rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-[#c9d1d9]">
            <Search className="size-4 shrink-0 text-[#8b949e]" />
            <input
              type="search"
              placeholder="Filtrar eventos…"
              autoComplete="off"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full border-0 bg-transparent text-sm outline-none"
            />
          </label>
          <button
            type="button"
            className="cursor-pointer rounded-lg border border-[#30363d] bg-[#21262d] px-3.5 py-2 text-xs font-semibold text-[#f0f6fc] hover:bg-[#30363d]"
            onClick={() => onPauseChange(!isPaused)}
          >
            {isPaused ? 'Retomar' : 'Pausar'}
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-lg border border-error/35 bg-[#21262d] px-3.5 py-2 text-xs font-semibold text-[#ff7b72] hover:bg-[#30363d]"
            onClick={onClear}
          >
            Limpar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#30363d] bg-[#0d1117] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[0.68rem] font-bold tracking-widest text-[#8b949e]">NÍVEIS</span>
          {LOG_LEVEL_FILTERS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={cn(
                'cursor-pointer rounded-md border px-2.5 py-1 text-[0.68rem] font-bold tracking-wide transition-all',
                auditChipStyles[chip.chipClass],
                isChipActive(chip.levels) ? 'opacity-100' : 'opacity-45',
              )}
              onClick={() => toggleLevelChip(chip.levels)}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <Checkbox
          label="Rolagem automática"
          labelClassName="text-[0.72rem] uppercase tracking-wide text-[#8b949e]"
          checked={autoScroll}
          onChange={(event) => onAutoScrollChange(event.target.checked)}
        />
      </div>

      <div
        className="max-h-[calc(100vh-320px)] min-h-[420px] overflow-auto bg-[#0d1117]"
        ref={outputWrapRef}
      >
        <div className="px-4 pb-2 pt-4 font-mono text-[0.8rem] leading-relaxed">
          {logs.length === 0 ? (
            <div className="py-6 text-[#8b949e]">{emptyMessage}</div>
          ) : (
            logs.map((entry, index) => {
              const hidden =
                !activeLevels.has(entry.level) ||
                (normalizedQuery.length > 0 && !entry.searchBlob.includes(normalizedQuery));
              return (
                <AuditLogLine
                  key={`${entry.timestamp}-${entry.source}-${index}`}
                  entry={entry}
                  hidden={hidden}
                  onSelect={onSelectMeta}
                />
              );
            })
          )}
          <span
            className="ml-4 inline-block h-[1.1em] w-[9px] animate-pulse bg-[#f0f6fc] align-bottom"
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[#30363d] bg-[#161b22] px-4 py-2.5 text-[0.72rem] uppercase tracking-wide text-[#8b949e]">
        <span>
          A MOSTRAR {visibleCount} DE {total} EVENTOS
        </span>
        <span>{transportLabel}</span>
      </div>
    </section>
  );
}
