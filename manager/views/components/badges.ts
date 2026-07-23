import { escapeHtml } from '../helpers.js';

export function statusBadge(ok: boolean, okLabel = 'Conectado', failLabel = 'Desconectado'): string {
  return ok
    ? `<span class="badge ok">${escapeHtml(okLabel)}</span>`
    : `<span class="badge warn">${escapeHtml(failLabel)}</span>`;
}

export function workerStatusBadge(status: string): string {
  if (status === 'running') return '<span class="badge ok">Rodando</span>';
  if (status === 'starting') return '<span class="badge warn">Iniciando…</span>';
  if (status === 'error') return '<span class="badge err">Erro</span>';
  return '<span class="badge warn">Parado</span>';
}

export function operatingStatusBadge(withinHours: boolean): string {
  return withinHours
    ? '<span class="badge ok">Ativo agora</span>'
    : '<span class="badge warn">Fora da janela</span>';
}
