import { expect, test } from '@playwright/test';

import { loginViaUi, mockSpaApi } from './helpers/mock-api.js';

test.describe('Cupons', () => {
  test.beforeEach(async ({ page }) => {
    await mockSpaApi(page);
    await loginViaUi(page);
  });

  test('atualiza e envia cupom mockado', async ({ page }) => {
    await page.goto('/coupons');
    await expect(page.getByRole('heading', { name: 'Cupons de afiliado' })).toBeVisible();

    await page.getByRole('button', { name: 'Atualizar cupons' }).click();
    await expect(page.getByText('FRETEGRATIS')).toBeVisible();

    await page.getByRole('button', { name: 'Enviar ao canal' }).click();
    await expect(page.getByText('FRETEGRATIS')).toBeVisible();
  });
});
