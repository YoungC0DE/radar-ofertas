import { expect, test } from '@playwright/test';

import { loginViaUi, mockSpaApi } from './helpers/mock-api.js';

test.describe('Worker — Settings › Operações', () => {
  test.beforeEach(async ({ page }) => {
    await mockSpaApi(page);
    await loginViaUi(page);
  });

  test('inicia worker via painel', async ({ page }) => {
    await page.goto('/settings#operacoes');
    await expect(page.getByRole('heading', { name: 'Configuração' })).toBeVisible();
    await expect(page.getByText('Worker de envio', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Iniciar', exact: true }).click();
    await expect(page.getByText('Rodando')).toBeVisible();
  });
});
