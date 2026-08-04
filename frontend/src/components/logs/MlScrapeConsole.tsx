import { useEffect, useRef } from 'react';

import type { ClassifiedMlScrapeEntry } from '../../types/api.js';
import { Checkbox } from '../ui/Checkbox.js';
import { MlScrapeLine } from './MlScrapeLine.js';

type MlScrapeConsoleProps = {
  logs: ClassifiedMlScrapeEntry[];
  mlScrapeCount: number;
  autoScroll: boolean;
  onAutoScrollChange: (enabled: boolean) => void;
  onSelectMeta: (meta: Record<string, unknown>) => void;
};

export function MlScrapeConsole({
  logs,
  mlScrapeCount,
  autoScroll,
  onAutoScrollChange,
  onSelectMeta,
}: MlScrapeConsoleProps) {
  const outputWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoScroll || !outputWrapRef.current) return;
    outputWrapRef.current.scrollTop = outputWrapRef.current.scrollHeight;
  }, [autoScroll, logs.length]);

  return (
    <section className="w-full overflow-hidden rounded-xl border border-[#30363d] bg-[#161b22] shadow-[0_8px_24px_rgba(1,4,9,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363d] bg-gradient-to-b from-[#1c2128] to-[#161b22] px-4 py-3.5">
        <h2 className="m-0 text-[0.74rem] font-bold tracking-widest text-[#ffe600]">
          LOG MERCADO LIVRE
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ffe600]/35 bg-[#ffe600]/10 px-2.5 py-1 text-[0.68rem] font-bold tracking-wide text-[#ffe600]">
          {mlScrapeCount} visitas
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-4 border-b border-[#30363d] bg-[#0d1117] px-4 py-3">
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
        <div className="px-3.5 py-3 font-mono text-[0.76rem] leading-normal">
          {logs.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-[#8b949e]">
              Nenhuma visita ao Mercado Livre ainda…
            </div>
          ) : (
            logs.map((entry) => (
              <MlScrapeLine
                key={`${entry.timestamp}-${entry.detail}`}
                entry={entry}
                onSelect={onSelectMeta}
              />
            ))
          )}
        </div>
      </div>
      <div className="flex justify-between gap-3 border-t border-[#30363d] bg-[#161b22] px-4 py-2.5 text-[0.68rem] uppercase tracking-wide text-[#8b949e]">
        <span>{logs.length} no buffer</span>
        <span>cada acesso ao site</span>
      </div>
    </section>
  );
}
