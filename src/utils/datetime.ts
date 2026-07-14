function getZonedParts(timeZone: string, instant: Date): Intl.DateTimeFormatPart[] {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
}

function partValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  const raw = parts.find((part) => part.type === type)?.value ?? '0';
  return Number.parseInt(raw, 10);
}

export function isValidTimezone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Horário no fuso informado, persistido como timestamp sem conversão extra —
 * o valor no banco corresponde ao relógio local da região.
 */
export function nowInTimezone(timeZone: string): Date {
  const instant = new Date();
  const parts = getZonedParts(timeZone, instant);

  return new Date(
    Date.UTC(
      partValue(parts, 'year'),
      partValue(parts, 'month') - 1,
      partValue(parts, 'day'),
      partValue(parts, 'hour'),
      partValue(parts, 'minute'),
      partValue(parts, 'second'),
      instant.getMilliseconds(),
    ),
  );
}

export function formatInTimezone(value: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(value);
}

/**
 * Formata datas gravadas via nowInTimezone — os componentes de horário
 * já correspondem ao relógio local e estão nos campos UTC do Date.
 */
export function formatStoredLocalDate(value: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(value);
}

export function formatIsoInTimezone(
  iso: string | null | undefined,
  timeZone: string,
): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return formatInTimezone(date, timeZone);
}

export interface OperatingHours {
  startHour: number;
  endHour: number;
}

export function getZonedTimeOfDay(
  timeZone: string,
  instant: Date = new Date(),
): { hour: number; minute: number; second: number } {
  const parts = getZonedParts(timeZone, instant);
  return {
    hour: partValue(parts, 'hour'),
    minute: partValue(parts, 'minute'),
    second: partValue(parts, 'second'),
  };
}

function minutesSinceMidnight(hour: number, minute: number, second: number): number {
  return hour * 60 + minute + second / 60;
}

function endMinutes(endHour: number): number {
  return endHour === 0 ? 24 * 60 : endHour * 60;
}

export function isWithinOperatingHours(
  timeZone: string,
  hours: OperatingHours,
  instant: Date = new Date(),
): boolean {
  const { hour, minute, second } = getZonedTimeOfDay(timeZone, instant);
  const current = minutesSinceMidnight(hour, minute, second);
  const start = hours.startHour * 60;
  const end = endMinutes(hours.endHour);
  return current >= start && current < end;
}

export function msUntilOperatingWindow(
  timeZone: string,
  hours: OperatingHours,
  instant: Date = new Date(),
): number {
  if (isWithinOperatingHours(timeZone, hours, instant)) return 0;

  const { hour, minute, second } = getZonedTimeOfDay(timeZone, instant);
  const current = minutesSinceMidnight(hour, minute, second);
  const start = hours.startHour * 60;

  const minutesToWait =
    current < start ? start - current : 24 * 60 - current + start;

  return Math.max(60_000, Math.ceil(minutesToWait * 60 * 1000));
}
