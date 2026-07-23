export interface MetricSnapshot {
  sendSuccess: Record<string, number>;
  sendFailure: Record<string, number>;
  scrapeLatencyMs: number[];
  scrapeFailures: number;
  circuitBreakerOpens: number;
  startedAt: string;
}

const MAX_LATENCY_SAMPLES = 100;

const counters = {
  sendSuccess: {} as Record<string, number>,
  sendFailure: {} as Record<string, number>,
  scrapeLatencyMs: [] as number[],
  scrapeFailures: 0,
  circuitBreakerOpens: 0,
  startedAt: new Date().toISOString(),
};

function channelKey(channel: string, accountId = 'default'): string {
  return `${channel}:${accountId}`;
}

export function recordSendSuccess(channel: string, accountId?: string): void {
  const key = channelKey(channel, accountId);
  counters.sendSuccess[key] = (counters.sendSuccess[key] ?? 0) + 1;
}

export function recordSendFailure(channel: string, accountId?: string): void {
  const key = channelKey(channel, accountId);
  counters.sendFailure[key] = (counters.sendFailure[key] ?? 0) + 1;
}

export function recordScrapeLatency(ms: number): void {
  counters.scrapeLatencyMs.push(ms);
  if (counters.scrapeLatencyMs.length > MAX_LATENCY_SAMPLES) {
    counters.scrapeLatencyMs.shift();
  }
}

export function recordScrapeFailure(): void {
  counters.scrapeFailures++;
}

export function recordCircuitBreakerOpen(): void {
  counters.circuitBreakerOpens++;
}

export function getMetrics(): MetricSnapshot {
  return {
    sendSuccess: { ...counters.sendSuccess },
    sendFailure: { ...counters.sendFailure },
    scrapeLatencyMs: [...counters.scrapeLatencyMs],
    scrapeFailures: counters.scrapeFailures,
    circuitBreakerOpens: counters.circuitBreakerOpens,
    startedAt: counters.startedAt,
  };
}

export function resetMetrics(): void {
  counters.sendSuccess = {};
  counters.sendFailure = {};
  counters.scrapeLatencyMs = [];
  counters.scrapeFailures = 0;
  counters.circuitBreakerOpens = 0;
  counters.startedAt = new Date().toISOString();
}
