import { useMemo, useState } from 'react';

import type { AccountCard as AccountCardData, AccountsResponse, SettingsResponse } from '../../types/api.js';
import {
  AFFILIATE_PLATFORM_DEFINITIONS,
  affiliateStatusLabel,
  buildExampleAmazonLink,
} from '../../constants/affiliates.js';
import { DEFAULT_ACCOUNT_ID, PLATFORM_ICONS } from '../../constants/accounts.js';
import { Badge } from '../ui/Badge.js';
import { ConfigRow, EditButton } from './ConfigRow.js';
import { CollectionPlatformCard } from './CollectionPlatformCard.js';
import { Tabs } from './Tabs.js';

type CollectionSectionProps = {
  readonly settings: SettingsResponse;
  readonly accounts: AccountsResponse;
  readonly onEditCouponsUrl: () => void;
  readonly onEditAmazonAffiliate: () => void;
  readonly onConfigureMercadoLivre: (accountId: string) => void;
  readonly onLoginMercadoLivre: (accountId: string) => void;
  readonly onToggleMercadoLivre: (accountId: string) => void;
  readonly onToggleAmazon: () => void;
};

function collectionStatusBadge(enabled: boolean) {
  return (
    <Badge tone={enabled ? 'success' : 'neutral'}>{enabled ? 'Ativo' : 'Desativado'}</Badge>
  );
}

function marketplaceConfigDetail(card: AccountCardData): string {
  const parts: string[] = [];
  if (card.mercadoLivre) {
    if (card.mercadoLivre.affiliateTag) {
      parts.push(
        card.mercadoLivre.affiliateTagFromEnv
          ? `Tag: ${card.mercadoLivre.affiliateTag} (.env)`
          : `Tag: ${card.mercadoLivre.affiliateTag}`,
      );
    } else {
      parts.push('Tag não configurada');
    }
  }
  parts.push(card.connection?.detail ?? 'Sem sessão de afiliado');
  return parts.join(' · ');
}

function resolveMercadoLivreCard(accounts: AccountsResponse): AccountCardData | undefined {
  return (
    accounts.marketplaces.find(
      (card) => card.account.platform === 'mercado_livre' && card.account.id === DEFAULT_ACCOUNT_ID,
    ) ?? accounts.marketplaces.find((card) => card.account.platform === 'mercado_livre')
  );
}

function MercadoLivrePanel({
  settings,
  accounts,
  onEditCouponsUrl,
  onConfigureMercadoLivre,
  onLoginMercadoLivre,
  onToggleMercadoLivre,
}: CollectionSectionProps) {
  const mlCard = useMemo(() => resolveMercadoLivreCard(accounts), [accounts]);

  if (!mlCard) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-bg-card/50 px-6 py-10 text-center text-sm text-text-secondary">
        Conta Mercado Livre indisponível.
      </div>
    );
  }

  const toggleDisabled = !(mlCard.connection?.loggedIn ?? false);

  return (
    <div className="flex flex-col gap-6">
      <CollectionPlatformCard
        label={mlCard.account.label}
        icon={PLATFORM_ICONS.mercado_livre}
        iconClassName="bg-gradient-to-br from-[#ffe600] to-[#f5c000] text-[#2d3277]"
        detail={marketplaceConfigDetail(mlCard)}
        enabled={mlCard.account.enabled}
        toggleDisabled={toggleDisabled}
        toggleTitle={toggleDisabled ? 'Faça login antes de habilitar' : undefined}
        onToggle={() => onToggleMercadoLivre(mlCard.account.id)}
        onConfigure={() => onConfigureMercadoLivre(mlCard.account.id)}
        onLogin={() => onLoginMercadoLivre(mlCard.account.id)}
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-bg-card">
        <ConfigRow
          label="URL de cupons"
          hint="Hub de cupons do portal de afiliados"
          value={
            <div className="flex flex-wrap items-center gap-2">
              <code className="max-w-full truncate rounded bg-bg-secondary px-1.5 py-0.5 text-[0.82rem]">
                {settings.mlCouponsUrl}
              </code>
              <EditButton title="Editar URL de cupons" onClick={onEditCouponsUrl} />
            </div>
          }
        />
      </div>
    </div>
  );
}

function AmazonPanel({ settings, onEditAmazonAffiliate, onToggleAmazon }: CollectionSectionProps) {
  const exampleLink = buildExampleAmazonLink(settings.amazonAffiliate);
  const storeConfigured = Boolean(settings.amazonAffiliate.storeId.trim());

  return (
    <div className="flex flex-col gap-6">
      <CollectionPlatformCard
        label="Amazon"
        icon={PLATFORM_ICONS.amazon}
        iconClassName="bg-gradient-to-br from-[#ff9900] to-[#e88b00]"
        detail={
          storeConfigured
            ? `Tag: ${settings.amazonAffiliate.storeId}`
            : 'ID da loja não configurado'
        }
        secondaryDetail="Coleta automática das fontes definidas no .env"
        enabled={settings.amazonCollectionEnabled}
        toggleDisabled={!storeConfigured}
        toggleTitle={!storeConfigured ? 'Configure o ID da loja antes de habilitar' : undefined}
        onToggle={onToggleAmazon}
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-bg-card">
        <ConfigRow
          label="Site Amazon"
          hint="Home do marketplace — ex.: amazon.com.br"
          value={
            <code className="max-w-full truncate rounded bg-bg-secondary px-1.5 py-0.5 text-[0.82rem]">
              {settings.amazonAffiliate.baseUrl}
            </code>
          }
        />
        <ConfigRow
          label="ID da loja (tag)"
          hint="Obrigatório — ex.: mercadaodasfa-20"
          value={
            <code className="max-w-full truncate rounded bg-bg-secondary px-1.5 py-0.5 text-[0.82rem]">
              {settings.amazonAffiliate.storeId || '—'}
            </code>
          }
        />
        <ConfigRow
          label="Prefixo customizado"
          hint="Opcional — deixe vazio para usar o formato oficial amazon.com.br/dp/ASIN?tag=..."
          value={
            <div className="flex flex-wrap items-center gap-2">
              {settings.amazonAffiliate.affiliateLinkPrefix.trim() ? (
                <code className="max-w-full truncate rounded bg-bg-secondary px-1.5 py-0.5 text-[0.82rem]">
                  {settings.amazonAffiliate.affiliateLinkPrefix}
                </code>
              ) : (
                <span className="text-sm text-text-secondary">Não usado — links gerados com ?tag=</span>
              )}
              <EditButton title="Editar links Amazon" onClick={onEditAmazonAffiliate} />
            </div>
          }
        />
        <ConfigRow
          label="Exemplo gerado"
          hint="ASIN B0DNHGQHMY com sua tag de afiliado"
          value={
            <code className="block max-w-full truncate rounded bg-bg-secondary px-1.5 py-0.5 text-[0.82rem]">
              {exampleLink}
            </code>
          }
        />
      </div>
    </div>
  );
}

function ComingSoonPanel({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-6">
      <p className="text-sm text-text-primary">
        O programa <strong>{label}</strong> ainda não está disponível nesta instalação.
      </p>
    </div>
  );
}

export function CollectionSection(props: CollectionSectionProps) {
  const { settings, accounts } = props;
  const [activeSubTab, setActiveSubTab] = useState('mercado_livre');

  const mlCard = useMemo(() => resolveMercadoLivreCard(accounts), [accounts]);
  const mlEnabled = mlCard?.account.enabled ?? false;

  const platformItems = AFFILIATE_PLATFORM_DEFINITIONS.map((platform) => ({
    id: platform.id,
    label: platform.label,
    badge:
      platform.status === 'coming_soon' ? (
        <Badge tone="neutral">{affiliateStatusLabel(platform.status)}</Badge>
      ) : platform.id === 'mercado_livre' ? (
        collectionStatusBadge(mlEnabled)
      ) : platform.id === 'amazon' ? (
        collectionStatusBadge(settings.amazonCollectionEnabled)
      ) : (
        collectionStatusBadge(false)
      ),
    content: (
      <>
        {platform.description ? (
          <p className="mb-4 text-sm text-text-secondary">{platform.description}</p>
        ) : null}
        {platform.id === 'mercado_livre' ? (
          <MercadoLivrePanel {...props} />
        ) : platform.id === 'amazon' ? (
          <AmazonPanel {...props} />
        ) : (
          <ComingSoonPanel label={platform.label} />
        )}
      </>
    ),
  }));

  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Ative ou desative cada marketplace de coleta. Quando desligado, o bot para de buscar ofertas
        naquela plataforma.
      </p>

      <Tabs
        items={platformItems}
        activeId={activeSubTab}
        onChange={setActiveSubTab}
        variant="sub"
        ariaLabel="Marketplaces de coleta"
      />
    </section>
  );
}
