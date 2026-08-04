import { useMemo } from 'react';

import type { AccountCard as AccountCardData, AccountsResponse } from '../../types/api.js';
import { AccountCard } from '../accounts/AccountCard.js';
import { AddAccountForm } from '../accounts/AddAccountForm.js';

type IntegrationsSectionProps = {
  readonly data: AccountsResponse;
  readonly onConfigure: (accountId: string, platform: AccountCardData['account']['platform']) => void;
  readonly onLoginWhatsApp: (accountId: string) => void;
  readonly onLoginTelegram: (accountId: string) => void;
  readonly onToggle: (accountId: string, platform: AccountCardData['account']['platform']) => void;
  readonly onDelete: (accountId: string, platform: AccountCardData['account']['platform'], label: string) => void;
  readonly onAddAccount: (body: { platform: AccountCardData['account']['platform']; label: string }) => Promise<void>;
};

export function IntegrationsSection({
  data,
  onConfigure,
  onLoginWhatsApp,
  onLoginTelegram,
  onToggle,
  onDelete,
  onAddAccount,
}: IntegrationsSectionProps) {
  const integrationCards = useMemo(() => data.integrations, [data.integrations]);

  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Canais de publicação — WhatsApp e Telegram. Faça login, configure destinos e ative ou desative
        cada conta.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {integrationCards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-bg-card/50 px-6 py-10 text-center text-sm text-text-secondary">
            <p>Nenhuma integração cadastrada.</p>
          </div>
        ) : (
          integrationCards.map((card) => (
            <AccountCard
              key={`${card.account.id}-${card.account.platform}`}
              card={card}
              variant="integration"
              onConfigure={() => onConfigure(card.account.id, card.account.platform)}
              onLogin={() => {
                if (card.account.platform === 'whatsapp') {
                  onLoginWhatsApp(card.account.id);
                } else if (card.account.platform === 'telegram') {
                  onLoginTelegram(card.account.id);
                }
              }}
              onToggle={() => onToggle(card.account.id, card.account.platform)}
              onDelete={() => onDelete(card.account.id, card.account.platform, card.account.label)}
            />
          ))
        )}
      </div>

      <AddAccountForm
        platforms={data.integrationPlatforms}
        placeholder="Ex: WhatsApp Promoções"
        onSubmit={onAddAccount}
      />
    </section>
  );
}
