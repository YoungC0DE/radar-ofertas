import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConnectionCard } from './ConnectionCard.js';

describe('ConnectionCard', () => {
  it('exibe Conectar quando desconectado', async () => {
    const onConnect = vi.fn();
    const user = userEvent.setup();

    render(
      <ConnectionCard
        service="wa"
        name="WhatsApp"
        icon="💬"
        status={{ ok: false, detail: 'Não logado' }}
        onConnect={onConnect}
      />,
    );

    expect(screen.getByText('Conectar')).toBeInTheDocument();
    expect(screen.getByText('Desconectado')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Conectar' }));
    expect(onConnect).toHaveBeenCalledOnce();
  });

  it('exibe Reconectar quando conectado', () => {
    render(
      <ConnectionCard
        service="ml"
        name="Mercado Livre"
        icon="🛒"
        status={{ ok: true, detail: 'Sessão ativa' }}
        onConnect={() => {}}
      />,
    );

    expect(screen.getByText('Reconectar')).toBeInTheDocument();
    expect(screen.getByText('Conectado')).toBeInTheDocument();
    expect(screen.getByText('Sessão ativa')).toBeInTheDocument();
  });

  it('desabilita botão quando connectDisabled', () => {
    render(
      <ConnectionCard
        service="telegram"
        name="Telegram"
        icon="✈"
        status={{ ok: false, detail: 'Verificando…' }}
        onConnect={() => {}}
        connectDisabled
      />,
    );

    expect(screen.getByRole('button', { name: 'Conectar' })).toBeDisabled();
  });
});
