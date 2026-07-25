import type { SettingsData } from '../../../models/settings-model.js';
import {
  PRISMA_ICON,
  renderConnectCard,
  renderWorkerCard,
  WORKER_ICON,
} from '../../components/index.js';

export function renderOperationsSection(data: SettingsData): string {
  const opsHint = data.canSpawnWorkers
    ? 'Controle o worker de envio pelo painel — um único processo publica em WhatsApp e Telegram. Não rode <code>npm run worker</code> em paralelo.'
    : 'Worker roda como serviço separado (Docker ou terminal). O painel apenas exibe o status via Redis.';

  const worker = data.senderWorker;
  const workerCard = renderWorkerCard({
    prefix: worker.prefix,
    channel: 'whatsapp',
    accountId: worker.accountId,
    name: 'Worker de envio',
    icon: WORKER_ICON,
    status: worker.state.status,
    detail:
      worker.state.detail ??
      (worker.state.status === 'running' ? 'Publicando ofertas nos canais habilitados' : 'Parado'),
    spawnEnabled: data.canSpawnWorkers,
  });

  return `
    <section class="settings-panel-section connect-section">
      <p class="meta">${opsHint}</p>
      <div class="connect-grid">
        ${workerCard}
        ${renderConnectCard({
          service: 'prisma',
          name: 'Prisma Client',
          icon: PRISMA_ICON,
          detail: 'Regenera o client do Prisma (<code>npm run prisma:generate</code>)',
          actionsHtml:
            '<button type="button" class="btn primary" id="prisma-generate">Gerar Prisma Client</button>',
        })}
      </div>
    </section>`;
}
