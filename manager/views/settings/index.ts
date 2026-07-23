import type { SettingsData } from '../../models/settings-model.js';
import { escapeHtml } from '../helpers.js';
import { operatingStatusBadge } from '../components/index.js';
import { configRow, EDIT_ICON, renderEditableValue } from '../components/index.js';
import { renderLayout } from '../layout.js';
import { renderSettingsAlert } from './alerts.js';
import {
  renderConnectionsSection,
  renderOperationsSection,
} from './sections/connections-section.js';
import { renderBrandSection } from './sections/brand-section.js';
import { renderChannelSection } from './sections/channel-section.js';
import { renderMlCouponsUrlSection, renderSourcesPointer } from './sections/sources-section.js';
import { renderOperatingHoursSection } from './sections/operating-hours-section.js';
import { renderScoreSection } from './sections/score-section.js';
import { renderSettingsModals } from './modals.js';
import { pageData, pageScripts, pageStyles } from '../page-assets.js';

export function renderSettingsPage(data: SettingsData): string {
  const statusBadge = operatingStatusBadge(data.withinOperatingHours);
  const alert = renderSettingsAlert(data.saved, data.error);

  const main = `
    ${alert}
    <section>
      <h2>Configuração</h2>

      <div class="config-grid">
        ${renderBrandSection(data)}
        ${configRow('Fuso', `<code>${escapeHtml(data.timezone)}</code>`, 'APP_TIMEZONE')}
        ${renderOperatingHoursSection(data, statusBadge)}
        ${renderScoreSection(data)}
        ${configRow(
          'Intervalo de coleta',
          renderEditableValue(
            'intervalo de coleta',
            `${data.collectorIntervalMinutes} min`,
            'edit-send-interval',
            EDIT_ICON,
          ),
          'Frequência de busca de novas ofertas',
        )}
        ${configRow(
          'Tempo entre envios',
          renderEditableValue(
            'tempo entre envios',
            `${data.senderDelayMinutes} min`,
            'edit-sender-delay',
            EDIT_ICON,
          ),
          'Intervalo entre cada mensagem enviada no WhatsApp',
        )}
        ${renderChannelSection(data)}
        ${renderMlCouponsUrlSection(data)}
        ${renderSourcesPointer(data)}
      </div>
    </section>

    ${renderConnectionsSection(data)}

    ${renderOperationsSection(data)}`;

  const afterMain = `
    ${renderSettingsModals(data)}

    ${pageData('settings-page-data', {
      brandInitial: data.brandInitial,
      brandLogoHref: data.brandLogoHref,
      canSpawnWorkers: data.canSpawnWorkers,
    })}
    ${pageScripts('shared/modal.js', 'shared/polling.js', 'settings.js')}`;

  return renderLayout('Configuração', main, 'settings', pageStyles('settings.css'), afterMain);
}
