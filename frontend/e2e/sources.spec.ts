import { expect, test } from '@playwright/test';

import { loginViaUi, mockSpaApi } from './helpers/mock-api.js';

test.describe('Fontes', () => {
  test.beforeEach(async ({ page }) => {
    await mockSpaApi(page);
    await loginViaUi(page);
  });

  test('lista fontes ML do canal WhatsApp', async ({ page }) => {
    await page.goto('/sources/whatsapp');
    await expect(page.getByRole('heading', { name: /Fontes de coleta — WhatsApp/i })).toBeVisible();
    await expect(page.getByText('Eletrônicos')).toBeVisible();
  });
});
