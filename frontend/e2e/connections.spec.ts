import { expect, test } from '@playwright/test';

import { loginViaUi, mockSpaApi } from './helpers/mock-api.js';

test.describe('Conexões WhatsApp', () => {
  test.beforeEach(async ({ page }) => {
    await mockSpaApi(page);
    await loginViaUi(page);
  });

  test('exibe QR ao iniciar login WhatsApp', async ({ page }) => {
    await page.goto('/settings#conexoes');
    await expect(page.getByRole('heading', { name: 'Configuração' })).toBeVisible();

    await page
      .locator('.connect-card')
      .filter({ hasText: 'WhatsApp' })
      .getByRole('button', { name: 'Conectar' })
      .click();

    await expect(page.getByRole('heading', { name: 'Logar no WhatsApp' })).toBeVisible();
    await expect(page.getByText('Escaneie o QR code com o WhatsApp:')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('img[alt="QR code do WhatsApp"]')).toBeVisible();
  });
});
