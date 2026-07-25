import type { SettingsData } from '../../../models/settings-model.js';
import { escapeHtml } from '../../helpers.js';
import { configRow, EDIT_ICON, renderEditableValue } from '../../components/index.js';
import { renderBrandSection } from './brand-section.js';
import { renderOperatingHoursSection } from './operating-hours-section.js';
import { renderScoreSection } from './score-section.js';

export function renderGeneralSection(data: SettingsData, statusBadge: string): string {
  return `
    <section class="settings-panel-section">
      <p class="meta">Identidade do painel, horários, pontuação e ritmo de coleta/envio. Canais de publicação ficam em <a class="link" href="/manager/accounts">Contas</a>.</p>
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
          'Intervalo entre cada mensagem enviada nos canais',
        )}
      </div>
    </section>`;
}
