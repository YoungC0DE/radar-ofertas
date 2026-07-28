import { expect, test } from '@playwright/test';

import { loginViaUi, mockSpaApi } from './helpers/mock-api.js';

test.describe('Login', () => {
  test('redireciona para dashboard após credenciais válidas', async ({ page }) => {
    await mockSpaApi(page);
    await loginViaUi(page);

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('42')).toBeVisible();
  });

  test('exibe erro quando login falha', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Credenciais inválidas', code: 'UNAUTHORIZED' }),
      });
    });

    await page.goto('/login');
    await page.getByLabel('Senha').waitFor({ state: 'visible' });
    await page.getByLabel('Senha').fill('wrong');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('Credenciais inválidas')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Navegação autenticada', () => {
  test.beforeEach(async ({ page }) => {
    await mockSpaApi(page);
    await loginViaUi(page);
  });

  test('sidebar leva à página de ofertas', async ({ page }) => {
    await page.getByRole('link', { name: 'Ofertas' }).click();
    await expect(page).toHaveURL('/offers');
  });
});
