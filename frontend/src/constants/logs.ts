export const LOG_LEVEL_FILTERS = [
  { id: 'info', label: 'INFO', chipClass: 'audit-chip-info', levels: ['info'] as const },
  { id: 'debug', label: 'OK', chipClass: 'audit-chip-ok', levels: ['debug'] as const },
  { id: 'warn', label: 'WARN', chipClass: 'audit-chip-warn', levels: ['warn'] as const },
  {
    id: 'error',
    label: 'ERROR',
    chipClass: 'audit-chip-error',
    levels: ['error', 'fatal'] as const,
  },
  { id: 'trace', label: 'SEC', chipClass: 'audit-chip-sec', levels: ['trace'] as const },
] as const;

export const DEFAULT_ACTIVE_LOG_LEVELS = new Set([
  'info',
  'debug',
  'warn',
  'error',
  'fatal',
  'trace',
]);

export const MAX_AUDIT_ROWS = 1000;
export const MAX_ML_SCRAPE_ROWS = 200;
export const LOGS_POLL_INTERVAL_MS = 3000;
