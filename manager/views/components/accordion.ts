import { escapeHtml } from '../helpers.js';

export function renderAccordionItem(
  title: string,
  description: string,
  content: string,
  open = false,
): string {
  return `<details class="settings-accordion"${open ? ' open' : ''}>
      <summary class="settings-accordion-summary">
        <span class="settings-accordion-title">${title}</span>
        <span class="settings-accordion-chevron" aria-hidden="true"></span>
      </summary>
      <div class="settings-accordion-body">
        ${description ? `<p class="meta">${description}</p>` : ''}
        ${content}
      </div>
    </details>`;
}

export function renderAccordionGroup(items: string[]): string {
  return `<div class="settings-accordions">${items.join('')}</div>`;
}

export function renderAccordionStatusBadge(status: 'active' | 'links_only' | 'coming_soon'): string {
  if (status === 'active') {
    return '<span class="badge ok">Ativo</span>';
  }
  if (status === 'links_only') {
    return '<span class="badge ok">Links</span>';
  }
  return '<span class="badge warn">Em breve</span>';
}

export function renderAccordionTitle(label: string, badgeHtml: string): string {
  return `<span class="settings-accordion-heading">${escapeHtml(label)} ${badgeHtml}</span>`;
}
