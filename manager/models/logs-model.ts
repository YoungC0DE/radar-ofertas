import { env } from '../../src/config/env.js';
import {
  getLogTotalCount,
  getRecentLogs,
  type LogEntry,
  type LogFilters,
  type LogLevel,
  type LogSource,
} from '../../src/utils/log-store.js';

export interface LogsPageData {
  logs: LogEntry[];
  total: number;
  filters: Required<Pick<LogFilters, 'level' | 'source' | 'limit'>>;
  redisEnabled: boolean;
}

const LEVELS: Array<LogLevel | 'all'> = ['all', 'trace', 'debug', 'info', 'warn', 'error', 'fatal'];
const SOURCES: Array<LogSource | 'all'> = ['all', 'collector', 'worker', 'manager'];

export function parseLogLevel(value: string | null): LogLevel | 'all' {
  if (value && LEVELS.includes(value as LogLevel | 'all')) {
    return value as LogLevel | 'all';
  }
  return 'all';
}

export function parseLogSource(value: string | null): LogSource | 'all' {
  if (value && SOURCES.includes(value as LogSource | 'all')) {
    return value as LogSource | 'all';
  }
  return 'all';
}

export function parseLogLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? '200', 10);
  if (!Number.isFinite(parsed)) return 200;
  return Math.min(Math.max(parsed, 50), 1000);
}

export async function loadLogsPage(searchParams: URLSearchParams): Promise<LogsPageData> {
  const filters = {
    level: parseLogLevel(searchParams.get('level')),
    source: parseLogSource(searchParams.get('source')),
    limit: parseLogLimit(searchParams.get('limit')),
  };

  const [logs, total] = await Promise.all([
    getRecentLogs(filters),
    getLogTotalCount(),
  ]);

  return {
    logs,
    total,
    filters,
    redisEnabled: env.REDIS_ENABLED,
  };
}

export interface LogsApiData {
  logs: LogEntry[];
  total: number;
}

export async function loadLogsApi(searchParams: URLSearchParams): Promise<LogsApiData> {
  const filters = {
    level: parseLogLevel(searchParams.get('level')),
    source: parseLogSource(searchParams.get('source')),
    limit: parseLogLimit(searchParams.get('limit')),
    since: searchParams.get('since') ?? undefined,
  };

  const [logs, total] = await Promise.all([getRecentLogs(filters), getLogTotalCount()]);
  return { logs, total };
}
