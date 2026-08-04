import { expect, test } from '@playwright/test';

import { loginViaUi, mockSpaApi } from './helpers/mock-api.js';

test.describe('Integrações (Configurações)', () => {
  test.beforeEach(async ({ page }) => {
    await mockSpaApi(page);
    await loginViaUi(page);
  });

  test('lista integrações WhatsApp', async ({ page }) => {
    await page.goto('/settings#integracoes');
    await expect(page.getByRole('tab', { name: 'Integrações' })).toBeVisible();
    await expect(page.getByText('WhatsApp default')).toBeVisible();
  });
});
