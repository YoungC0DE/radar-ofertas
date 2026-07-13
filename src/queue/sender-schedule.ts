import { getRuntimeQueueConfig, getSenderDelayMs } from '../config/queue-config-store.js';
import { env } from '../config/env.js';
import { isWithinOperatingHours, msUntilOperatingWindow } from '../utils/datetime.js';
import { getSenderQueue, isRedisEnabled } from './index.js';

function nextOperatingCursor(timezone: string, instantMs: number): number {
  const instant = new Date(instantMs);
  if (isWithinOperatingHours(timezone, getOperatingHours(), instant)) {
    return instantMs;
  }
  return instantMs + msUntilOperatingWindow(timezone, getOperatingHours(), instant);
}

function getOperatingHours() {
  const config = getRuntimeQueueConfig();
  return {
    startHour: config.operatingHoursStart,
    endHour: config.operatingHoursEnd,
  };
}

export async function estimatePendingSendTimes(offerIds: string[]): Promise<Map<string, Date>> {
  const result = new Map<string, Date>();
  if (offerIds.length === 0) return result;

  const config = getRuntimeQueueConfig();
  const timezone = env.APP_TIMEZONE;
  const senderDelayMs = getSenderDelayMs(config);
  let cursor = nextOperatingCursor(timezone, Date.now());

  if (!isRedisEnabled()) {
    for (const offerId of offerIds) {
      result.set(offerId, new Date(cursor));
      cursor += senderDelayMs;
    }
    return result;
  }

  const queue = getSenderQueue();
  const targets = new Set(offerIds);

  try {
    const [active, waiting, delayed] = await Promise.all([
      queue.getActive(0, 50),
      queue.getWaiting(0, 200),
      queue.getDelayed(0, 200),
    ]);

    const delayedSorted = [...delayed].sort(
      (a, b) => a.timestamp + a.delay - (b.timestamp + b.delay),
    );
    const ordered = [...active, ...waiting, ...delayedSorted];

    for (const job of ordered) {
      const offerId = job.data.offerId;
      const state = await job.getState();

      if (state === 'delayed') {
        cursor = Math.max(cursor, Date.now() + Math.max(0, job.delay));
        cursor = nextOperatingCursor(timezone, cursor);
      }

      if (targets.has(offerId)) {
        result.set(offerId, new Date(cursor));
      }

      cursor += senderDelayMs;
      cursor = nextOperatingCursor(timezone, cursor);
    }
  } finally {
    await queue.close();
  }

  for (const offerId of offerIds) {
    if (result.has(offerId)) continue;
    result.set(offerId, new Date(cursor));
    cursor += senderDelayMs;
    cursor = nextOperatingCursor(timezone, cursor);
  }

  return result;
}
