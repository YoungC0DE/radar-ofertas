import type { SettingsResponse } from '../../types/api.js';
import { WorkerCard } from './WorkerCard.js';
import { PrismaCard } from './PrismaCard.js';

type OperationsSectionProps = {
  data: SettingsResponse;
};

export function OperationsSection({ data }: OperationsSectionProps) {
  const opsHint = data.worker.canSpawnWorkers
    ? 'Controle o worker de envio pelo painel — um único processo publica em WhatsApp e Telegram. Não rode npm run worker em paralelo.'
    : 'Worker roda como serviço separado (Docker ou terminal). O painel apenas exibe o status via Redis.';

  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">{opsHint}</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <WorkerCard
          accountId={data.worker.sender.accountId}
          channel="whatsapp"
          spawnEnabled={data.worker.canSpawnWorkers}
          initialState={data.worker.sender.state}
        />
        <PrismaCard spawnEnabled={data.worker.canSpawnWorkers} />
      </div>
    </section>
  );
}
