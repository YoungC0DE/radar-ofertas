import { useEffect, useRef } from 'react';

export function usePolling<T>(
  fetcher: () => Promise<T>,
  onData: (data: T) => void,
  intervalMs: number,
  enabled = true,
) {
  const fetcherRef = useRef(fetcher);
  const onDataRef = useRef(onData);

  fetcherRef.current = fetcher;
  onDataRef.current = onData;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const tick = async () => {
      try {
        const data = await fetcherRef.current();
        if (!cancelled) onDataRef.current(data);
      } catch {
        /* polling silencioso — UI trata estado anterior */
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [intervalMs, enabled]);
}
