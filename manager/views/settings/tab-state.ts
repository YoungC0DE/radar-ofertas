import type { SettingsSaveType } from '../../models/settings-model.js';

export type SettingsTabId = 'geral' | 'afiliados' | 'operacoes';

export type AffiliateSubTabId = 'mercado_livre' | 'amazon' | 'shopee';

const SETTINGS_TAB_IDS: readonly SettingsTabId[] = [
  'geral',
  'afiliados',
  'operacoes',
];

const AFFILIATE_SUB_TAB_IDS: readonly AffiliateSubTabId[] = [
  'mercado_livre',
  'amazon',
  'shopee',
];

export function resolveSettingsActiveTab(saved: SettingsSaveType): SettingsTabId {
  switch (saved) {
    case 'interval':
    case 'brand':
    case 'score':
    case 'hours':
    case 'senderDelay':
      return 'geral';
    case 'couponsUrl':
    case 'amazonAffiliate':
    case 'mlSources':
      return 'afiliados';
    default:
      return 'geral';
  }
}

export function resolveAffiliateSubTab(saved: SettingsSaveType): AffiliateSubTabId {
  if (saved === 'amazonAffiliate') return 'amazon';
  if (saved === 'couponsUrl' || saved === 'mlSources') return 'mercado_livre';
  return 'mercado_livre';
}

export function isSettingsTabId(value: string): value is SettingsTabId {
  return (SETTINGS_TAB_IDS as readonly string[]).includes(value);
}

export function isAffiliateSubTabId(value: string): value is AffiliateSubTabId {
  return (AFFILIATE_SUB_TAB_IDS as readonly string[]).includes(value);
}
