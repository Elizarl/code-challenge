import { expect, test } from '@playwright/test';

import { appAlert, forceWalletState, login, setWalletState } from './helpers';

test.describe('Home', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('muestra saldo, nombre y movimientos', async ({ page }) => {
    await expect(page.getByTestId('balance')).toHaveText(/^\$[\d,]+\.\d{2}$/);
    await expect(page.getByText('Paola Elizalde').first()).toBeVisible();

    const movements = page.getByTestId('movement-list').getByRole('listitem');
    await expect(movements.first()).toBeVisible();
    expect(await movements.count()).toBeGreaterThan(0);
  });

  test('estado vacío cuando no hay movimientos', async ({ page }) => {
    await forceWalletState(page, 'empty');

    await expect(page.getByText('Todavía no hay movimientos')).toBeVisible();
    await expect(page.getByTestId('movement-list')).toBeHidden();
    await expect(page.getByTestId('balance')).toBeVisible();
  });

  test('estado de error con reintento que se recupera', async ({ page }) => {
    await forceWalletState(page, 'error');

    await expect(appAlert(page)).toContainText('No pudimos cargar tu cartera digital.');

    await setWalletState(page, null);
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByTestId('balance')).toBeVisible();
  });

  test('lleva a la pantalla de nueva transacción', async ({ page }) => {
    await page.getByRole('link', { name: 'Nueva transacción' }).click();
    await expect(page).toHaveURL(/\/transfer$/);
    await expect(page.getByRole('heading', { name: 'Nueva transacción' })).toBeVisible();
  });
});
