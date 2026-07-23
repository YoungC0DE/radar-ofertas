import { escapeHtml } from '../helpers.js';
import {
  getBrandInitial,
  getBrandLogoHref,
  getBrandSettings,
} from '../../models/brand-model.js';
import { getEnabledChannels } from '../../../src/channels/index.js';
import { CHANNEL_LABELS } from '../../../src/channels/types.js';
import { NAV_ICONS } from './nav-icons.js';
import { LAYOUT_SCRIPTS } from '../page-assets.js';

export function renderLayoutShell(
  title: string,
  body: string,
  activeNav?: string,
  headExtras = '',
): string {
  const brand = getBrandSettings();
  const brandLogo = getBrandLogoHref(brand);
  const brandMark = brandLogo
    ? `<img src="${escapeHtml(brandLogo)}" alt="${escapeHtml(brand.name)}">`
    : escapeHtml(getBrandInitial(brand.name));

  const navWithIcon = (href: string, label: string, key: string, iconKey: string) => {
    const cls = activeNav === key ? 'nav-item active' : 'nav-item';
    const icon = NAV_ICONS[iconKey] ?? '';
    return `<a href="${href}" class="${cls}"><span class="nav-icon">${icon}</span><span class="nav-label">${escapeHtml(label)}</span></a>`;
  };

  const nav = (href: string, label: string, key: string) => navWithIcon(href, label, key, key);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — ${escapeHtml(brand.name)}</title>
  <link rel="stylesheet" href="/manager/assets/css/base.css">
  ${headExtras}
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <div class="brand">
        <a href="/manager" class="brand-logo">
          <div class="brand-mark">${brandMark}</div>
          <div>
            <div class="brand-name">${escapeHtml(brand.name)}</div>
            <div class="brand-sub">${escapeHtml(brand.subtitle)}</div>
          </div>
        </a>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-section">Menu</div>
        ${nav('/manager', 'Dashboard', 'dashboard')}
        ${nav('/manager/offers', 'Ofertas', 'offers')}
        ${nav('/manager/coupons', 'Cupons', 'coupons')}
        ${nav('/manager/template', 'Mensagem', 'template')}
        ${nav('/manager/logs', 'Log', 'logs')}
        ${nav('/manager/settings', 'Configuração', 'settings')}
        ${nav('/manager/accounts', 'Contas', 'accounts')}
        <div class="nav-section">Fontes de coleta</div>
        ${getEnabledChannels()
          .map((channel) =>
            navWithIcon(`/manager/sources/${channel}`, CHANNEL_LABELS[channel], `sources-${channel}`, 'sources'),
          )
          .join('')}
      </nav>
      <div class="sidebar-footer">v1.0 · Bot WhatsApp</div>
    </aside>

    <div class="main-wrap">
      <header class="topbar">
        <h1>${escapeHtml(title)}</h1>
        <span class="topbar-badge">Manager</span>
      </header>
      <main class="content">${body}</main>
    </div>
  </div>

  <div id="confirm-modal" class="modal-overlay hidden" aria-hidden="true">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div class="modal-header">
        <h3 id="confirm-modal-title">Confirmar</h3>
      </div>
      <div class="modal-body">
        <p id="confirm-modal-message"></p>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn" id="confirm-modal-cancel">Cancelar</button>
        <button type="button" class="btn primary" id="confirm-modal-ok">Confirmar</button>
      </div>
    </div>
  </div>

  ${LAYOUT_SCRIPTS}
</body>
</html>`;
}
