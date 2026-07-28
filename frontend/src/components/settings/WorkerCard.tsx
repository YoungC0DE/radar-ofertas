import { useCallback, useEffect, useState } from 'react';

import { api } from '../../services/api.js';
import type { WorkerState } from '../../types/api.js';
import { Badge } from '../ui/Badge.js';
import { Button } from '../ui/Button.js';
import { Card } from '../ui/Card.js';

function workerBadgeTone(status: WorkerState['status']): 'success' | 'warning' | 'danger' {
  if (status === 'running') return 'success';
  if (status === 'starting') return 'warning';
  if (status === 'error') return 'danger';
  return 'warning';
}

function workerBadgeLabel(status: WorkerState['status']): string {
  if (status === 'running') return 'Rodando';
  if (status === 'starting') return 'Iniciando…';
  if (status === 'error') return 'Erro';
  return 'Parado';
}

type WorkerCardProps = {
  accountId: string;
  channel: 'whatsapp' | 'telegram';
  spawnEnabled: boolean;
  initialState: WorkerState;
};

export function WorkerCard({ accountId, channel, spawnEnabled, initialState }: WorkerCardProps) {
  const [state, setState] = useState(initialState);
  const [busy, setBusy] = useState(false);

  const params = { channel, accountId: accountId !== 'default' ? accountId : undefined };

  const refresh = useCallback(async () => {
    try {
      const next = await api.getWorkerStatus(params);
      setState(next);
    } catch {
      /* polling silencioso */
    }
  }, [accountId, channel]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 2500);
    return () => window.clearInterval(id);
  }, [refresh]);

  const running = state.status === 'running' || state.status === 'starting';
  const detail =
    state.detail ??
    (running ? 'Publicando ofertas nos canais habilitados' : 'Processo de envio parado');

  async function runAction(
    action: () => Promise<WorkerState>,
    pendingMessage: string,
  ) {
    if (!spawnEnabled) return;
    setBusy(true);
    setState((current) => ({ ...current, detail: pendingMessage }));
    try {
      setState(await action());
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card padding="md">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-xl text-white">
            ⚙
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-text-primary">Worker de envio</div>
            <div className="mt-1 text-sm text-text-secondary">{detail}</div>
          </div>
          <Badge tone={workerBadgeTone(state.status)}>{workerBadgeLabel(state.status)}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {spawnEnabled ? (
            <>
              <Button
                disabled={busy || running}
                onClick={() => void runAction(() => api.startWorker(params), 'Iniciando worker…')}
              >
                Iniciar
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => void runAction(() => api.restartWorker(params), 'Reiniciando worker…')}
              >
                Reiniciar
              </Button>
              <Button
                variant="danger"
                disabled={busy || !running}
                onClick={() => void runAction(() => api.stopWorker(params), 'Parando worker…')}
              >
                Parar
              </Button>
            </>
          ) : (
            <span className="text-sm text-text-secondary">Gerenciado externamente (Docker/terminal)</span>
          )}
        </div>
      </div>
    </Card>
  );
}
