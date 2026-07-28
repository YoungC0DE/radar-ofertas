import { useEffect, useRef } from 'react';

import type { ClassifiedMlScrapeEntry } from '../../types/api.js';
import { MlScrapeLine } from './MlScrapeLine.js';

type MlScrapeConsoleProps = {
  logs: ClassifiedMlScrapeEntry[];
  mlScrapeCount: number;
  autoScroll: boolean;
  onSelectMeta: (meta: Record<string, unknown>) => void;
};

export function MlScrapeConsole({
  logs,
  mlScrapeCount,
  autoScroll,
  onSelectMeta,
}: MlScrapeConsoleProps) {
  const outputWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoScroll || !outputWrapRef.current) return;
    outputWrapRef.current.scrollTop = outputWrapRef.current.scrollHeight;
  }, [autoScroll, logs.length]);

  return (
    <aside className="flex min-w-[480px] max-w-[900px] flex-[1_1_640px] flex-col overflow-hidden rounded-xl border border-[#30363d] bg-[#161b22] shadow-[0_8px_24px_rgba(1,4,9,0.35)] xl:max-w-[900px]">
      <div className="flex items-center justify-between gap-3 border-b border-[#30363d] bg-gradient-to-b from-[#1c2128] to-[#161b22] px-4 py-3.5">
        <h2 className="m-0 text-[0.74rem] font-bold tracking-widest text-[#ffe600]">
          LOG MERCADO LIVRE
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ffe600]/35 bg-[#ffe600]/10 px-2.5 py-1 text-[0.68rem] font-bold tracking-wide text-[#ffe600]">
          {mlScrapeCount} visitas
        </span>
      </div>
      <div
        className="max-h-[calc(100vh-280px)] min-h-[420px] flex-1 overflow-auto bg-[#0d1117]"
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
    </aside>
  );
}
