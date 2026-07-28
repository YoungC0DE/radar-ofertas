import { useEffect, useRef, useState } from 'react';

import { api } from '../../services/api.js';
import type { PrismaState } from '../../types/api.js';
import { Button } from '../ui/Button.js';
import { Card } from '../ui/Card.js';
import { Modal } from '../ui/Modal.js';

type PrismaCardProps = {
  spawnEnabled: boolean;
};

export function PrismaCard({ spawnEnabled }: PrismaCardProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<PrismaState>({ status: 'idle', output: '', error: null });
  const pollRef = useRef<number | null>(null);

  function stopPoll() {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => () => stopPoll(), []);

  async function pollStatus() {
    try {
      const next = await api.getPrismaStatus();
      setState(next);
      if (next.status === 'done' || next.status === 'error') stopPoll();
    } catch {
      /* ignore */
    }
  }

  async function handleGenerate() {
    if (!spawnEnabled) return;
    setOpen(true);
    setState({ status: 'running', output: '', error: null });
    stopPoll();
    try {
      setState(await api.runPrismaGenerate());
    } catch {
      setState({ status: 'error', output: '', error: 'Falha ao iniciar prisma generate' });
    }
    pollRef.current = window.setInterval(() => void pollStatus(), 1200);
  }

  function handleClose() {
    stopPoll();
    setOpen(false);
  }

  const statusLabel =
    state.status === 'running'
      ? 'Executando prisma generate…'
      : state.status === 'done'
        ? 'Prisma Client gerado com sucesso!'
        : state.status === 'error'
          ? 'Falha ao gerar o Prisma Client.'
          : 'Pronto para executar.';

  return (
    <>
      <Card padding="md">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-slate-900 text-xl text-white">
              ◆
            </span>
            <div>
              <div className="font-semibold text-text-primary">Prisma Client</div>
              <div className="mt-1 text-sm text-text-secondary">
                Regenera o client do Prisma (npm run prisma:generate)
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!spawnEnabled} onClick={() => void handleGenerate()}>
              Gerar Prisma Client
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        open={open}
        title="Gerar Prisma Client"
        onClose={handleClose}
        wide
        footer={
          <Button variant="secondary" onClick={handleClose}>
            Fechar
          </Button>
        }
      >
        <p className="text-sm font-medium text-text-primary">{statusLabel}</p>
        <pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-bg-secondary p-3 text-[0.82rem]">
          {state.output}
        </pre>
        {state.error ? <p className="mt-2 text-sm text-error">{state.error}</p> : null}
      </Modal>
    </>
  );
}
