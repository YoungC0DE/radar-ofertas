import { escapeHtml } from '../helpers.js';

export type TabItem = {
  readonly id: string;
  readonly label: string;
  readonly content: string;
  readonly badgeHtml?: string;
};

type RenderTabsOptions = {
  readonly activeId: string;
  readonly variant?: 'primary' | 'sub';
  readonly ariaLabel?: string;
};

function tabListClass(variant: RenderTabsOptions['variant']): string {
  return variant === 'sub' ? 'settings-tab-list settings-tab-list-sub' : 'settings-tab-list';
}

function tabButtonClass(variant: RenderTabsOptions['variant'], active: boolean): string {
  const base = variant === 'sub' ? 'settings-tab settings-tab-sub' : 'settings-tab';
  return active ? `${base} active` : base;
}

function tabPanelClass(variant: RenderTabsOptions['variant'], active: boolean): string {
  const base = variant === 'sub' ? 'settings-tab-panel settings-tab-panel-sub' : 'settings-tab-panel';
  return active ? `${base} active` : base;
}

export function renderTabs(items: readonly TabItem[], options: RenderTabsOptions): string {
  const variant = options.variant ?? 'primary';
  const listClass = tabListClass(variant);
  const ariaLabel = options.ariaLabel ?? 'Seções';

  const buttons = items
    .map((item) => {
      const active = item.id === options.activeId;
      return `<button
        type="button"
        class="${tabButtonClass(variant, active)}"
        id="tab-${escapeHtml(item.id)}"
        role="tab"
        aria-selected="${active ? 'true' : 'false'}"
        aria-controls="tab-panel-${escapeHtml(item.id)}"
        data-tab="${escapeHtml(item.id)}"
      >${escapeHtml(item.label)}${item.badgeHtml ?? ''}</button>`;
    })
    .join('');

  const panels = items
    .map((item) => {
      const active = item.id === options.activeId;
      return `<div
        class="${tabPanelClass(variant, active)}"
        id="tab-panel-${escapeHtml(item.id)}"
        role="tabpanel"
        aria-labelledby="tab-${escapeHtml(item.id)}"
        ${active ? '' : 'hidden'}
      >${item.content}</div>`;
    })
    .join('');

  return `<div class="settings-tabs${variant === 'sub' ? ' settings-tabs-sub' : ''}">
    <div class="${listClass}" role="tablist" aria-label="${escapeHtml(ariaLabel)}">${buttons}</div>
    <div class="settings-tab-panels">${panels}</div>
  </div>`;
}
