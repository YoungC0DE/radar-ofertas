import { expect, test } from '@playwright/test';

import { loginViaUi, mockSpaApi } from './helpers/mock-api.js';

test.describe('Logs', () => {
  test.beforeEach(async ({ page }) => {
    await mockSpaApi(page);
    await loginViaUi(page);
  });

  test('exibe console de auditoria e visitas ML', async ({ page }) => {
    await page.goto('/logs');
    await expect(page.getByRole('heading', { name: 'Log', exact: true })).toBeVisible();
    await expect(page.getByText('Coleta enfileirada')).toBeVisible();
    await expect(page.getByText('lista.mercadolivre.com.br')).toBeVisible();
  });
});
