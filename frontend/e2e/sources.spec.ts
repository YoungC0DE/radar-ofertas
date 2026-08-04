import { expect, test } from '@playwright/test';

import { loginViaUi, mockSpaApi } from './helpers/mock-api.js';

test.describe('Coleta (Configurações)', () => {
  test.beforeEach(async ({ page }) => {
    await mockSpaApi(page);
    await loginViaUi(page);
  });

  test('exibe plataformas de coleta Mercado Livre e Amazon', async ({ page }) => {
    await page.goto('/settings#coleta');
    await expect(page.getByRole('tab', { name: 'Coleta' })).toBeVisible();
    await expect(page.getByText('Afiliado ML principal')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mercado Livre' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Amazon' })).toBeVisible();
  });
});
