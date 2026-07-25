import type { SettingsData } from '../../models/settings-model.js';
import { operatingStatusBadge } from '../components/index.js';
import { renderLayoutShell as renderLayout } from '../layout/shell.js';
import { renderSettingsAlert } from './alerts.js';
import { renderOperationsSection } from './sections/connections-section.js';
import { renderAffiliateProgramsSection } from './sections/affiliate-section.js';
import { renderGeneralSection } from './sections/general-section.js';
import { renderSettingsModals } from './modals.js';
import { renderTabs } from '../components/tabs.js';
import {
  resolveAffiliateSubTab,
  resolveSettingsActiveTab,
} from './tab-state.js';
import { pageData, pageScripts, pageStyles } from '../page-assets.js';

export function renderSettingsPage(data: SettingsData): string {
  const statusBadge = operatingStatusBadge(data.withinOperatingHours);
  const alert = renderSettingsAlert(data.saved, data.error);
  const activeTab = resolveSettingsActiveTab(data.saved);
  const affiliateSubTab = resolveAffiliateSubTab(data.saved);

  const tabs = renderTabs(
    [
      {
        id: 'geral',
        label: 'Geral',
        content: renderGeneralSection(data, statusBadge),
      },
      {
        id: 'afiliados',
        label: 'Afiliados',
        content: renderAffiliateProgramsSection(data, affiliateSubTab),
      },
      {
        id: 'operacoes',
        label: 'Operações',
        content: renderOperationsSection(data),
      },
    ],
    { activeId: activeTab, ariaLabel: 'Configurações' },
  );

  const main = `${alert}${tabs}`;

  const afterMain = `
    ${renderSettingsModals(data)}

    ${pageData('settings-page-data', {
      brandInitial: data.brandInitial,
      brandLogoHref: data.brandLogoHref,
      canSpawnWorkers: data.canSpawnWorkers,
      activeTab,
      affiliateSubTab,
    })}
    ${pageScripts('shared/modal.js', 'shared/polling.js', 'settings.js')}`;

  return renderLayout('Configuração', main, 'settings', pageStyles('settings.css'), afterMain);
}
