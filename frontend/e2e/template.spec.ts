import { expect, test } from '@playwright/test';

import { loginViaUi, mockSpaApi } from './helpers/mock-api.js';

test.describe('Template', () => {
  test.beforeEach(async ({ page }) => {
    await mockSpaApi(page);
    await loginViaUi(page);
  });

  test('exibe editor de template e auto-messages', async ({ page }) => {
    await page.goto('/template');
    await expect(page.getByRole('heading', { name: 'Mensagem' })).toBeVisible();
    await expect(page.getByText('Mensagem de ofertas')).toBeVisible();
  });
});
