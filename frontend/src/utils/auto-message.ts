import type { AutoMessageScheduleType, SerializedAutoMessage } from '../types/api.js';
import { formatDate } from './format.js';

export function toDatetimeLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

export function parseDatetimeLocalToIso(value: string): string | undefined {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return undefined;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  const h = Number(match[4]);
  const min = Number(match[5]);
  const date = new Date(Date.UTC(y, m, d, h, min, 0, 0));
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export function formatTimeInputValue(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function describeAutoMessageSchedule(message: SerializedAutoMessage): string {
  if (!message.enabled) return 'Pausada';
  if (message.scheduleType === 'daily' && message.dailyHour !== null) {
    const minute = message.dailyMinute ?? 0;
    return `Diário às ${formatTimeInputValue(message.dailyHour, minute)}`;
  }
  if (message.scheduleType === 'once' && message.scheduledAt) {
    return `Programada para ${formatDate(message.scheduledAt)}`;
  }
  return 'Salva — envio manual';
}

export function renderAutoMessagePreview(content: string, brand = 'Radar Ofertas'): string {
  const now = new Date();
  const date = now.toLocaleDateString('pt-BR');
  const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const replacements: Record<string, string> = { brand, date, time };
  let result = content;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value);
  }
  return result.trim();
}

export type AutoMessageFormState = {
  title: string;
  content: string;
  scheduleType: AutoMessageScheduleType;
  scheduledAt: string;
  dailyTime: string;
  enabled: boolean;
};

export function autoMessageToFormState(message: SerializedAutoMessage): AutoMessageFormState {
  return {
    title: message.title,
    content: message.content,
    scheduleType: message.scheduleType,
    scheduledAt: toDatetimeLocalInputValue(message.scheduledAt),
    dailyTime:
      message.dailyHour !== null
        ? formatTimeInputValue(message.dailyHour, message.dailyMinute ?? 0)
        : '08:00',
    enabled: message.enabled,
  };
}

export function formStateToAutoMessageBody(state: AutoMessageFormState) {
  const body: {
    title: string;
    content: string;
    scheduleType: AutoMessageScheduleType;
    enabled: boolean;
    scheduledAt?: string;
    dailyTime?: string;
  } = {
    title: state.title.trim(),
    content: state.content.trim(),
    scheduleType: state.scheduleType,
    enabled: state.enabled,
  };

  if (state.scheduleType === 'once' && state.scheduledAt) {
    const iso = parseDatetimeLocalToIso(state.scheduledAt);
    if (iso) body.scheduledAt = iso;
  }

  if (state.scheduleType === 'daily') {
    body.dailyTime = state.dailyTime;
  }

  return body;
}

export function describeFormSchedule(state: AutoMessageFormState): string {
  if (!state.enabled) return 'Pausada';
  if (state.scheduleType === 'daily') return `Diário às ${state.dailyTime}`;
  if (state.scheduleType === 'once' && state.scheduledAt) {
    return `Programada para ${state.scheduledAt.replace('T', ' ')}`;
  }
  return 'Salva — envio manual';
}

export function emptyAutoMessageFormState(): AutoMessageFormState {
  return {
    title: '',
    content: '',
    scheduleType: 'manual',
    scheduledAt: '',
    dailyTime: '08:00',
    enabled: true,
  };
}
