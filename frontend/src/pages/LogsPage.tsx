import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '../services/api.js';
import type { ClassifiedLogEntry, ClassifiedMlScrapeEntry } from '../types/api.js';
import { AuditConsole } from '../components/logs/AuditConsole.js';
import { LogMetaModal } from '../components/logs/LogMetaModal.js';
import { MlScrapeConsole } from '../components/logs/MlScrapeConsole.js';
import { Tabs, useHashTab } from '../components/settings/Tabs.js';
import { PageHeader } from '../components/layout/PageHeader.js';
import { Alert } from '../components/ui/Alert.js';
import { Page } from '../components/ui/Layout.js';
import { Spinner } from '../components/ui/Spinner.js';
import {
  LOGS_POLL_INTERVAL_MS,
  MAX_AUDIT_ROWS,
  MAX_ML_SCRAPE_ROWS,
} from '../constants/logs.js';
import { useLogsStream } from '../hooks/useLogsStream.js';

const LOG_TABS = ['geral', 'mercado_livre'] as const;

function trimRows<T>(rows: T[], max: number): T[] {
  if (rows.length <= max) return rows;
  return rows.slice(rows.length - max);
}

function appendRows<T>(current: T[], incoming: T[], max: number): T[] {
  if (incoming.length === 0) return current;
  return trimRows([...current, ...incoming], max);
}

export function LogsPage() {
  const [activeTab, setActiveTab] = useHashTab('geral', LOG_TABS);
  const [logs, setLogs] = useState<ClassifiedLogEntry[]>([]);
  const [mlScrapeLogs, setMlScrapeLogs] = useState<ClassifiedMlScrapeEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [mlScrapeCount, setMlScrapeCount] = useState(0);
  const [transportLabel, setTransportLabel] = useState('API REST');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [wasCleared, setWasCleared] = useState(false);
  const [selectedMeta, setSelectedMeta] = useState<Record<string, unknown> | null>(null);
  const [usePollingFallback, setUsePollingFallback] = useState(false);

  const lastTimestampRef = useRef('');
  const lastMlTimestampRef = useRef('');
  const isPausedRef = useRef(isPaused);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const applyInitialPayload = useCallback(
    (payload: Awaited<ReturnType<typeof api.getLogs>>) => {
      setTotal(payload.total);
      setMlScrapeCount(payload.mlScrapeCount);
      if (payload.redisEnabled != null) {
        setTransportLabel(payload.redisEnabled ? 'REDIS + SSE' : 'SSE LOCAL');
      }
      setLogs(payload.logs);
      setMlScrapeLogs(payload.mlScrapeLogs);
      lastTimestampRef.current = payload.logs.at(-1)?.timestamp ?? '';
      lastMlTimestampRef.current = payload.mlScrapeLogs.at(-1)?.timestamp ?? '';
    },
    [],
  );

  const applyPollPayload = useCallback(
    (payload: Awaited<ReturnType<typeof api.getLogs>>) => {
      setTotal(payload.total);
      setMlScrapeCount(payload.mlScrapeCount);
      if (payload.redisEnabled != null) {
        setTransportLabel(payload.redisEnabled ? 'REDIS + API' : 'API LOCAL');
      }

      setLogs((current) => {
        const next = appendRows(current, payload.logs, MAX_AUDIT_ROWS);
        lastTimestampRef.current = next.at(-1)?.timestamp ?? lastTimestampRef.current;
        if (payload.logs.length > 0) setWasCleared(false);
        return next;
      });

      setMlScrapeLogs((current) => {
        const next = appendRows(current, payload.mlScrapeLogs, MAX_ML_SCRAPE_ROWS);
        lastMlTimestampRef.current = next.at(-1)?.timestamp ?? lastMlTimestampRef.current;
        return next;
      });
    },
    [],
  );

  const refreshLogs = useCallback(async () => {
    if (isPausedRef.current) return;

    try {
      const payload = await api.getLogs({
        level: 'all',
        source: 'all',
        limit: 1000,
        since: lastTimestampRef.current || undefined,
        mlSince: lastMlTimestampRef.current || undefined,
      });
      applyPollPayload(payload);
    } catch {
      // Polling falha silenciosamente — próxima tentativa em 3s
    }
  }, [applyPollPayload]);

  useEffect(() => {
    let cancelled = false;

    void api
      .getLogs({ level: 'all', source: 'all', limit: 200 })
      .then((payload) => {
        if (cancelled) return;
        applyInitialPayload(payload);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar logs');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applyInitialPayload]);

  useLogsStream({
    enabled: !loading && !isPaused && !usePollingFallback,
    onReady: (payload) => {
      setTransportLabel(payload.redisEnabled ? 'REDIS + SSE' : 'SSE LOCAL');
    },
    onLog: (event) => {
      if (event.type === 'audit') {
        setLogs((current) => appendRows(current, [event.entry], MAX_AUDIT_ROWS));
        setTotal((value) => value + 1);
        setWasCleared(false);
        lastTimestampRef.current = event.entry.timestamp;
        return;
      }

      setMlScrapeLogs((current) => appendRows(current, [event.entry], MAX_ML_SCRAPE_ROWS));
      setMlScrapeCount((value) => value + 1);
      lastMlTimestampRef.current = event.entry.timestamp;
    },
    onError: () => setUsePollingFallback(true),
  });

  useEffect(() => {
    if (!usePollingFallback || isPaused) return;

    const timer = window.setInterval(() => {
      void refreshLogs();
    }, LOGS_POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [usePollingFallback, isPaused, refreshLogs]);

  function handlePauseChange(paused: boolean) {
    setIsPaused(paused);
    if (!paused && usePollingFallback) void refreshLogs();
  }

  function handleClear() {
    setLogs([]);
    setWasCleared(true);
    lastTimestampRef.current = logs.at(-1)?.timestamp ?? lastTimestampRef.current;
  }

  if (loading) {
    return <Spinner label="Carregando logs…" />;
  }

  if (error) {
    return <Alert tone="error">{error}</Alert>;
  }

  const tabItems = [
    {
      id: 'geral',
      label: 'Geral',
      content: (
        <AuditConsole
          logs={logs}
          total={total}
          transportLabel={transportLabel}
          emptyMessage={
            wasCleared
              ? 'Console limpo. Novos eventos aparecerão aqui.'
              : 'Aguardando eventos do sistema…'
          }
          isPaused={isPaused}
          autoScroll={autoScroll}
          onPauseChange={handlePauseChange}
          onAutoScrollChange={setAutoScroll}
          onClear={handleClear}
          onSelectMeta={setSelectedMeta}
        />
      ),
    },
    {
      id: 'mercado_livre',
      label: 'Mercado Livre',
      content: (
        <MlScrapeConsole
          logs={mlScrapeLogs}
          mlScrapeCount={mlScrapeCount}
          autoScroll={autoScroll}
          onAutoScrollChange={setAutoScroll}
          onSelectMeta={setSelectedMeta}
        />
      ),
    },
  ];

  return (
    <Page>
      <PageHeader
        title="Log"
        subtitle="Auditoria interna e visitas ao Mercado Livre, separados por aba"
      />

      <Tabs items={tabItems} activeId={activeTab} onChange={setActiveTab} ariaLabel="Logs" />

      <LogMetaModal
        open={selectedMeta != null}
        meta={selectedMeta}
        onClose={() => setSelectedMeta(null)}
      />
    </Page>
  );
}
