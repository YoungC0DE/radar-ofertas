import { formatStoredLocalDate } from '../../src/utils/datetime.js';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(value: Date | null, _timeZone?: string): string {
  if (!value) return '—';
  return formatStoredLocalDate(value);
}

export function formatDateTimeString(value: string | null | undefined, timeZone: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatDate(date, timeZone);
}

export function statusBadge(sentAt: Date | null): string {
  if (sentAt) {
    return '<span class="badge sent">Enviada</span>';
  }
  return '<span class="badge pending">Pendente</span>';
}
