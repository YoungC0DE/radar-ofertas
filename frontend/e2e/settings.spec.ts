import { expect, test } from '@playwright/test';

import { loginViaUi, mockSpaApi } from './helpers/mock-api.js';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await mockSpaApi(page);
    await loginViaUi(page);
  });

  test('salva score mínimo via modal', async ({ page }) => {
    await page.goto('/settings#geral');
    await expect(page.getByRole('heading', { name: 'Configuração' })).toBeVisible();

    await page.getByTitle('Editar pontuação').click();
    await page.getByLabel('Score mínimo para aceitar oferta').fill('60');
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByText('Mínimo: 60 pts')).toBeVisible();
  });
});
