import { expect, test } from '@playwright/test';

import { loginViaUi, mockSpaApi } from './helpers/mock-api.js';

test.describe('Ofertas', () => {
  test.beforeEach(async ({ page }) => {
    await mockSpaApi(page);
    await loginViaUi(page);
  });

  test('enfileira coleta manual', async ({ page }) => {
    await page.getByRole('link', { name: 'Ofertas' }).click();
    await expect(page).toHaveURL('/offers');

    await page.getByRole('button', { name: 'Buscar Ofertas' }).click();
    await page.getByLabel('Nome do produto').fill('notebook gamer');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page.getByText('Coleta enfileirada com sucesso')).toBeVisible();
  });

  test('envia oferta imediatamente no detalhe', async ({ page }) => {
    await page.goto('/offers/offer-1');
    await expect(page.getByRole('heading', { level: 1, name: 'Produto teste E2E' })).toBeVisible();

    await page.getByRole('button', { name: 'Enviar agora' }).click();
    await expect(page.getByText('Oferta enfileirada para envio imediato')).toBeVisible();
  });
});
