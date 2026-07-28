import type { Page } from '@playwright/test';

const MOCK_USER = {
  id: 'user-1',
  username: 'admin',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const MOCK_TOKENS = {
  accessToken: 'e2e-access-token',
  refreshToken: 'e2e-refresh-token',
  tokenType: 'Bearer' as const,
  expiresIn: 3600,
  refreshExpiresIn: 86_400,
};

const MOCK_SCORE_CONFIG = {
  minScore: 50,
  discount: { enabled: true, cumulative: false, tiers: [{ enabled: true, threshold: 10, points: 20 }] },
  rating: { enabled: false, cumulative: false, tiers: [] },
  soldQuantity: { enabled: false, cumulative: false, tiers: [] },
  price: { enabled: false, cumulative: false, tiers: [] },
};

export const MOCK_SETTINGS = {
  timezone: 'America/Sao_Paulo',
  operatingHours: { start: 9, end: 0 },
  operatingHoursLabel: '09:00 – 00:00',
  withinOperatingHours: true,
  minScore: 50,
  scoreConfig: MOCK_SCORE_CONFIG,
  scoreRulesSummary: ['Desconto ≥ 10% → +20 pts'],
  collectorIntervalMinutes: 15,
  senderDelayMinutes: 15,
  brand: { name: 'Radar', subtitle: 'Ofertas', logoHref: null, initial: 'R' },
  sessions: {
    mercadoLivre: { ok: true, detail: 'Sessão OK' },
    whatsapp: { ok: false, detail: 'Desconectado' },
    telegram: null,
  },
  telegram: { enabled: false, chatId: '', hasBotToken: false },
  worker: {
    state: { status: 'stopped', startedAt: null, detail: null },
    sender: {
      accountId: 'default',
      label: 'WhatsApp default',
      prefix: 'wa',
      state: { status: 'stopped', startedAt: null, detail: null },
    },
    canSpawnWorkers: true,
  },
  mlCouponsUrl: 'https://www.mercadolivre.com.br/afiliados/coupons#hub',
  amazonAffiliate: { baseUrl: 'https://www.amazon.com.br/', affiliateLinkPrefix: '', storeId: '' },
};

export const MOCK_OFFER = {
  id: 'offer-1',
  mercadoLivreId: 'MLB123',
  title: 'Produto teste E2E',
  price: 99.9,
  oldPrice: 149.9,
  discount: 33,
  image: null,
  permalink: 'https://example.com',
  affiliateLink: null,
  rating: 4.5,
  soldQuantity: 100,
  salesRank: null,
  seller: 'Loja Teste',
  officialStore: false,
  bestSeller: false,
  score: 80,
  sentAt: null,
  createdAt: '2026-01-01T12:00:00.000Z',
};

export async function mockAuthApi(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_TOKENS),
    });
  });

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: MOCK_USER }),
    });
  });

  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_TOKENS),
    });
  });
}

export async function mockDashboardApi(page: Page): Promise<void> {
  await page.route('**/api/v1/dashboard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        stats: { total: 42, pending: 5, sent: 37 },
        withinOperatingHours: true,
        timezone: 'America/Sao_Paulo',
        operatingHours: { start: 9, end: 0 },
        sessions: [],
        queues: {},
        pendingOffers: [],
        sentOffers: [],
      }),
    });
  });
}

export async function mockSettingsApi(page: Page): Promise<void> {
  let settings = structuredClone(MOCK_SETTINGS);

  await page.route('**/api/v1/settings**', async (route) => {
    const method = route.request().method();
    const url = route.request().url();

    if (method === 'GET' && url.endsWith('/settings')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(settings),
      });
      return;
    }

    if (method === 'PATCH' && url.includes('/settings/score')) {
      const body = route.request().postDataJSON() as { minScore?: number };
      if (typeof body.minScore === 'number') {
        settings = {
          ...settings,
          minScore: body.minScore,
          scoreConfig: { ...settings.scoreConfig, minScore: body.minScore },
        };
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(settings),
      });
      return;
    }

    await route.continue();
  });
}

export async function mockOffersApi(page: Page): Promise<void> {
  await page.route('**/api/v1/offers**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/collect') || url.includes('/settings/') || /\/offers\/[^/?]+$/.test(url)) {
      await route.fallback();
      return;
    }

    if (method !== 'GET') {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        database: { available: true },
        offers: [MOCK_OFFER],
        scheduleByOfferId: {},
        deliveriesByOfferId: {},
        filter: 'all',
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
        pendingCount: 1,
        searchLimit: 50,
        affiliateDelay: {
          delayMs: 500,
          backlogDelayMinutes: 2,
          backlogThreshold: 5,
        },
      }),
    });
  });

  await page.route('**/api/v1/offers/collect', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ queued: true }),
    });
  });

  await page.route('**/api/v1/offers/offer-1/send-now', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, offerId: 'offer-1' }),
    });
  });

  await page.route('**/api/v1/offers/offer-1', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          offer: MOCK_OFFER,
          messagePreview: 'Preview da mensagem',
          coupon: null,
        }),
      });
      return;
    }
    await route.fallback();
  });
}

export async function mockAccountsApi(page: Page): Promise<void> {
  await page.route('**/api/v1/accounts**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/connect/whatsapp/start') && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'qr', qr: 'mock-qr-payload', error: null }),
      });
      return;
    }

    if (url.includes('/connect/whatsapp/status') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'qr', qr: 'mock-qr-payload', error: null }),
      });
      return;
    }

    if (method === 'GET' && url.endsWith('/accounts')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          integrations: [
            {
              account: {
                id: 'default',
                platform: 'whatsapp',
                label: 'WhatsApp default',
                enabled: true,
                config: {},
              },
              whatsapp: {
                destinations: [],
                channelId: '',
                channelName: null,
                channelInviteLink: '',
                channelConfigured: false,
              },
              connection: { loggedIn: false, detail: 'Desconectado' },
            },
          ],
          marketplaces: [],
          integrationPlatforms: [{ id: 'whatsapp', label: 'WhatsApp' }],
          marketplacePlatforms: [{ id: 'mercado_livre', label: 'Mercado Livre' }],
          canSpawnWorkers: true,
        }),
      });
      return;
    }

    await route.fallback();
  });
}

export async function mockTemplateApi(page: Page): Promise<void> {
  const section = {
    template: 'Oferta: {{title}} — {{price}}',
    defaultTemplate: 'Oferta: {{title}}',
    placeholderVisibility: { title: true, price: true },
    previewText: 'Oferta: Produto teste — R$ 99',
    previewValues: { title: 'Produto teste', price: 'R$ 99' },
  };

  await page.route('**/api/v1/template**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          database: { available: true },
          offerTemplate: { ...section, previewOffer: null },
          couponTemplate: section,
          autoMessages: [
            {
              id: 'auto-1',
              title: 'Bom dia',
              content: 'Olá!',
              scheduleType: 'daily',
              scheduledAt: null,
              dailyHour: 9,
              dailyMinute: 0,
              enabled: true,
              lastSentAt: null,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          autoMessagePlaceholders: [{ key: 'brand', label: 'Marca', example: 'Radar' }],
        }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.route('**/api/v1/auto-messages**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

export async function mockCouponsApi(page: Page): Promise<void> {
  const coupon = {
    id: 'coupon-1',
    title: 'Frete grátis',
    code: 'FRETEGRATIS',
    status: 'available',
    expiresAt: '2026-12-31T23:59:59.000Z',
    storeUrl: null,
  };

  await page.route('**/api/v1/coupons**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (method === 'GET' && url.endsWith('/coupons')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ coupons: [coupon], lastRefreshedAt: null }),
      });
      return;
    }

    if (method === 'POST' && url.includes('/refresh')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ coupons: [coupon], lastRefreshedAt: new Date().toISOString() }),
      });
      return;
    }

    if (method === 'POST' && url.includes('/send')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
      return;
    }

    if (method === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...coupon, storeUrl: 'https://loja.example' }),
      });
      return;
    }

    await route.fallback();
  });
}

export async function mockSourcesApi(page: Page): Promise<void> {
  await page.route('**/api/v1/sources/**', async (route) => {
    const method = route.request().method();
    const body = {
      channel: 'whatsapp',
      channelLabel: 'WhatsApp',
      channels: [{ channel: 'whatsapp', label: 'WhatsApp', active: true }],
      mlRows: [
        {
          id: 'ml-env-0',
          label: 'Eletrônicos',
          category: 'MLB1648',
          fromEnv: true,
          valid: true,
          type: 'category',
          listingKind: 'category',
          channels: ['whatsapp'],
        },
      ],
      amazonRows: [],
      activeCount: 1,
    };

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
      return;
    }

    if (method === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
      return;
    }

    await route.fallback();
  });
}

export async function mockLogsApi(page: Page): Promise<void> {
  await page.route('**/api/v1/logs**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        logs: [
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            source: 'collector',
            message: 'Coleta enfileirada',
            meta: { channel: 'whatsapp' },
            module: 'collector',
            action: 'collect',
            metaTrail: '',
            chip: 'info',
            chipClass: 'chip-info',
            searchBlob: 'coleta enfileirada',
          },
        ],
        mlScrapeLogs: [
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'ML site visit',
            meta: {},
            detail: 'https://lista.mercadolivre.com.br/notebooks',
            status: '200',
            statusClass: 'ok',
            method: 'http',
          },
        ],
        total: 1,
        mlScrapeCount: 1,
        redisEnabled: true,
      }),
    });
  });
}

export async function mockWorkerApi(page: Page): Promise<void> {
  let workerState = { status: 'stopped', startedAt: null, detail: null };

  await page.route('**/api/v1/worker/**', async (route) => {
    const method = route.request().method();
    const url = route.request().url();

    if (method === 'GET' && url.includes('/status')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(workerState),
      });
      return;
    }

    if (method === 'POST' && url.includes('/start')) {
      workerState = {
        status: 'running',
        startedAt: new Date().toISOString(),
        detail: 'Worker iniciado (E2E mock)',
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(workerState),
      });
      return;
    }

    if (method === 'POST' && url.includes('/stop')) {
      workerState = { status: 'stopped', startedAt: null, detail: 'Parado pelo E2E' };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(workerState),
      });
      return;
    }

    await route.fallback();
  });
}

export async function mockSpaApi(page: Page): Promise<void> {
  await mockAuthApi(page);
  await mockDashboardApi(page);
  await mockOffersApi(page);
  await mockSettingsApi(page);
  await mockAccountsApi(page);
  await mockTemplateApi(page);
  await mockCouponsApi(page);
  await mockSourcesApi(page);
  await mockLogsApi(page);
  await mockWorkerApi(page);
}

export async function loginViaUi(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Senha').waitFor({ state: 'visible' });
  await page.getByLabel('Senha').fill('secret');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('/');
}
