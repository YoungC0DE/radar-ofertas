import { useEffect, useRef } from 'react';

import type { LogsStreamLogEvent, LogsStreamReadyEvent } from '@radar/shared';

import { getAccessToken } from '../services/auth-storage.js';
import { readSseStream } from '../utils/sse.js';

const API_PREFIX = '/api/v1';

function resolveBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  return '';
}

type UseLogsStreamOptions = {
  readonly enabled: boolean;
  readonly onReady: (payload: LogsStreamReadyEvent) => void;
  readonly onLog: (payload: LogsStreamLogEvent) => void;
  readonly onError?: () => void;
};

export function useLogsStream({
  enabled,
  onReady,
  onLog,
  onError,
}: UseLogsStreamOptions): void {
  const onReadyRef = useRef(onReady);
  const onLogRef = useRef(onLog);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    onLogRef.current = onLog;
  }, [onLog]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    let cancelled = false;

    async function connect(): Promise<void> {
      const token = getAccessToken();
      if (!token) return;

      try {
        const response = await fetch(
          `${resolveBaseUrl()}${API_PREFIX}/logs/stream?level=all&source=all`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          onErrorRef.current?.();
          return;
        }

        await readSseStream(
          response,
          (event, data) => {
            if (cancelled) return;
            if (event === 'ready') {
              onReadyRef.current(JSON.parse(data) as LogsStreamReadyEvent);
              return;
            }
            if (event === 'log') {
              onLogRef.current(JSON.parse(data) as LogsStreamLogEvent);
            }
          },
          controller.signal,
        );
      } catch {
        if (!controller.signal.aborted) {
          onErrorRef.current?.();
        }
      }
    }

    void connect();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled]);
}
