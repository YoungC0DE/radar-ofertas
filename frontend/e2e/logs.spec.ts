import { expect, test } from '@playwright/test';

import { loginViaUi, mockSpaApi } from './helpers/mock-api.js';

test.describe('Logs', () => {
  test.beforeEach(async ({ page }) => {
    await mockSpaApi(page);
    await loginViaUi(page);
  });

  test('exibe abas Geral e Mercado Livre com conteúdo separado', async ({ page }) => {
    await page.goto('/logs');
    await expect(page.getByRole('heading', { name: 'Log', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Geral' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Mercado Livre' })).toBeVisible();
    await expect(page.getByText('Coleta enfileirada')).toBeVisible();
    await expect(page.getByText('lista.mercadolivre.com.br')).not.toBeVisible();

    await page.getByRole('tab', { name: 'Mercado Livre' }).click();
    await expect(page.getByText('lista.mercadolivre.com.br')).toBeVisible();
    await expect(page.getByText('Coleta enfileirada')).not.toBeVisible();
  });
});
