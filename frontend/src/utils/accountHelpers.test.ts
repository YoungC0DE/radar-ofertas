import { describe, expect, it } from 'vitest';

import type { AccountCard } from '../types/api.js';
import {
  isIntegrationConfigured,
  resolveIntegrationDisplayStatus,
  resolveMarketplaceDisplayStatus,
} from './accountHelpers.js';

function whatsappCard(overrides: Partial<AccountCard> = {}): AccountCard {
  return {
    account: {
      id: 'default',
      label: 'WhatsApp',
      platform: 'whatsapp',
      enabled: true,
      config: {},
    },
    whatsapp: {
      destinations: [],
      channelId: '123@newsletter',
      channelName: 'Canal',
      channelInviteLink: 'https://whatsapp.com/channel/abc',
      channelConfigured: true,
    },
    connection: { loggedIn: true, detail: 'Conectado' },
    ...overrides,
  };
}

describe('accountHelpers', () => {
  it('isIntegrationConfigured detecta WhatsApp sem canal', () => {
    const card = whatsappCard({
      whatsapp: {
        destinations: [],
        channelId: '',
        channelName: null,
        channelInviteLink: '',
        channelConfigured: false,
      },
    });
    expect(isIntegrationConfigured(card)).toBe(false);
  });

  it('resolveIntegrationDisplayStatus inativo sem login', () => {
    const card = whatsappCard({
      connection: { loggedIn: false, detail: 'Desconectado' },
    });
    expect(resolveIntegrationDisplayStatus(card)).toBe('inactive');
  });

  it('resolveMarketplaceDisplayStatus exige enabled + loggedIn', () => {
    const card = whatsappCard({
      account: {
        id: 'default',
        label: 'ML',
        platform: 'mercado_livre',
        enabled: false,
        config: {},
      },
      connection: { loggedIn: true, detail: 'OK' },
    });
    expect(resolveMarketplaceDisplayStatus(card)).toBe('inactive');
  });
});
