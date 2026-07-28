import type { AccountCard as AccountCardData } from '../../types/api.js';
import { cn } from '../../lib/cn.js';
import { DEFAULT_ACCOUNT_ID, PLATFORM_ICONS } from '../../constants/accounts.js';
import {
  isIntegrationConfigured,
  resolveIntegrationDisplayStatus,
  resolveMarketplaceDisplayStatus,
} from '../../utils/accountHelpers.js';
import { Button } from '../ui/Button.js';
import { AccountEnabledToggle } from './AccountEnabledToggle.js';

type AccountCardProps = {
  card: AccountCardData;
  variant: 'integration' | 'marketplace';
  onConfigure: () => void;
  onLogin: () => void;
  onToggle: () => void;
  onDelete?: () => void;
};

const platformIconStyles: Record<string, string> = {
  whatsapp: 'bg-gradient-to-br from-[#25d366] to-[#128c7e]',
  telegram: 'bg-gradient-to-br from-[#2aabee] to-[#229ed9]',
  mercado_livre: 'bg-gradient-to-br from-[#ffe600] to-[#f5c000] text-[#2d3277]',
};

function integrationConfigDetail(card: AccountCardData): string {
  if (card.account.platform === 'whatsapp' && card.whatsapp) {
    return card.whatsapp.channelConfigured
      ? `Canal: ${card.whatsapp.channelName ?? card.whatsapp.channelId}`
      : 'Canal não configurado';
  }
  if (card.account.platform === 'telegram' && card.telegram) {
    return card.telegram.chatId
      ? `Canal: ${card.telegram.chatId}`
      : 'Token/canal não configurados';
  }
  return '';
}

function marketplaceConfigDetail(card: AccountCardData): string {
  const parts: string[] = [];
  if (card.account.platform === 'mercado_livre' && card.mercadoLivre) {
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

export function AccountCard({
  card,
  variant,
  onConfigure,
  onLogin,
  onToggle,
  onDelete,
}: AccountCardProps) {
  const { account } = card;
  const icon = PLATFORM_ICONS[account.platform] ?? '•';
  const isDefault = account.id === DEFAULT_ACCOUNT_ID;
  const status =
    variant === 'integration'
      ? resolveIntegrationDisplayStatus(card)
      : resolveMarketplaceDisplayStatus(card);
  const disabledCard = status === 'inactive';

  const configDetail =
    variant === 'integration' ? integrationConfigDetail(card) : marketplaceConfigDetail(card);
  const connectionDetail =
    variant === 'integration' ? (card.connection?.detail ?? '') : '';

  const toggleDisabled =
    variant === 'integration'
      ? !isIntegrationConfigured(card) || !(card.connection?.loggedIn ?? false)
      : !(card.connection?.loggedIn ?? false);

  const showConfigure =
    account.platform === 'whatsapp' ||
    account.platform === 'telegram' ||
    account.platform === 'mercado_livre';

  const iconStyle =
    platformIconStyles[account.platform] ?? 'bg-gradient-to-br from-indigo-500 to-indigo-700';

  return (
    <article
      className={cn(
        'flex flex-col gap-4 rounded-2xl border border-border bg-bg-card p-5 transition-opacity',
        disabledCard && 'opacity-70',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl text-xl text-white',
            iconStyle,
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-semibold text-text-primary">{account.label}</div>
            <span
              className={cn(
                'text-xs font-semibold',
                status === 'active' ? 'text-success' : 'text-text-secondary',
              )}
            >
              {status === 'active' ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          {configDetail ? (
            <div className="mt-1 text-sm text-text-secondary">{configDetail}</div>
          ) : null}
          {connectionDetail ? (
            <div className="mt-1 text-sm text-text-secondary">{connectionDetail}</div>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <AccountEnabledToggle
          checked={account.enabled}
          disabled={toggleDisabled}
          title={
            variant === 'marketplace' && !card.connection?.loggedIn
              ? 'Faça login antes de habilitar'
              : undefined
          }
          onChange={() => onToggle()}
        />
        {showConfigure ? (
          <Button variant="secondary" onClick={onConfigure}>
            Configurar
          </Button>
        ) : null}
        <Button onClick={onLogin}>Logar</Button>
        {!isDefault && onDelete ? (
          <Button variant="danger" onClick={onDelete}>
            Remover
          </Button>
        ) : null}
      </div>
    </article>
  );
}
