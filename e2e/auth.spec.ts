import { expect, test } from '@playwright/test';

import { appAlert, DEMO_HANDLE, login } from './helpers';

test.describe('Autenticación', () => {
  test('redirige al login y recuerda el destino', async ({ page }) => {
    await page.goto('/transfer');

    await expect(page).toHaveURL(/\/login\?next=%2Ftransfer/);
    await expect(page.getByRole('heading', { name: 'Wallet' })).toBeVisible();
  });

  test('vuelve al destino original después de iniciar sesión', async ({ page }) => {
    await page.goto('/transfer');
    await page.getByLabel('Email o teléfono').fill(DEMO_HANDLE);
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page).toHaveURL(/\/transfer$/);
  });

  test('valida el formato antes de llamar al servidor', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email o teléfono').fill('no-es-un-handle');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(appAlert(page)).toHaveText('Ingresa un email o teléfono válido.');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('exige un campo no vacío', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(appAlert(page)).toHaveText('Ingresa tu email o teléfono.');
  });

  test('muestra el error del servidor sin romper el formulario', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email o teléfono').fill('error@wallet.com');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(appAlert(page)).toContainText(
      'No pudimos iniciar sesión en este momento. Intenta nuevamente.',
    );
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel('Email o teléfono').fill(DEMO_HANDLE);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL(/\/home$/);
  });

  test('acepta un teléfono además de un email', async ({ page }) => {
    await login(page, '+15555550100');
    await expect(page.getByTestId('balance')).toBeVisible();
  });

  test('cierra sesión y bloquea el acceso posterior', async ({ page }) => {
    await login(page);

    await page.getByRole('button', { name: 'Salir' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/home');
    await expect(page).toHaveURL(/\/login\?next=%2Fhome/);
  });

  test('un usuario autenticado no vuelve a ver el login', async ({ page }) => {
    await login(page);

    await page.goto('/login');
    await expect(page).toHaveURL(/\/home$/);
  });
});
