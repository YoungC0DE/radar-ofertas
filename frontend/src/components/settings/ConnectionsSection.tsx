import { Link } from 'react-router-dom';

import type { SettingsResponse } from '../../types/api.js';
import { Card } from '../ui/Card.js';
import { ConnectionCard } from './ConnectionCard.js';

type ConnectionsSectionProps = {
  data: SettingsResponse;
  onConnectWhatsApp: () => void;
  onConnectMercadoLivre: () => void;
  onVerifyTelegram: () => void;
  telegramBusy?: boolean;
};

export function ConnectionsSection({
  data,
  onConnectWhatsApp,
  onConnectMercadoLivre,
  onVerifyTelegram,
  telegramBusy = false,
}: ConnectionsSectionProps) {
  const telegramEnabled = data.telegram.enabled;

  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Status das integrações principais. Para várias contas ou configuração de canal, use{' '}
        <Link className="text-primary hover:underline" to="/accounts">
          Contas
        </Link>
        .
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ConnectionCard
          service="wa"
          name="WhatsApp"
          icon="💬"
          status={data.sessions.whatsapp}
          onConnect={onConnectWhatsApp}
        />
        <ConnectionCard
          service="ml"
          name="Mercado Livre"
          icon="🛒"
          status={data.sessions.mercadoLivre}
          onConnect={onConnectMercadoLivre}
        />
        {telegramEnabled && data.sessions.telegram ? (
          <ConnectionCard
            service="telegram"
            name="Telegram"
            icon="✈"
            status={data.sessions.telegram}
            onConnect={onVerifyTelegram}
            connectDisabled={telegramBusy}
          />
        ) : (
          <Card padding="md" className="opacity-85">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2aabee] to-[#229ed9] text-xl text-white">
                ✈
              </span>
              <div>
                <div className="font-semibold text-text-primary">Telegram</div>
                <div className="mt-1 text-sm text-text-secondary">
                  Desativado — configure token e canal em{' '}
                  <Link className="text-primary hover:underline" to="/accounts">
                    Contas
                  </Link>
                  .
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </section>
  );
}
