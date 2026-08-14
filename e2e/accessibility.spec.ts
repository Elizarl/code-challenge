import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { forceOutcome, forceWalletState, login } from './helpers';

const STANDARD = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function scan(page: Page) {
  return new AxeBuilder({ page }).withTags(STANDARD).analyze();
}

async function expectNoViolations(page: Page) {
  const results = await scan(page);
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact ?? 'n/a'}): ${v.help} — ${v.nodes.length} node(s)`,
  );
  expect(summary, summary.join('\n')).toEqual([]);
}

test.describe('Accesibilidad (axe-core, WCAG 2.1 AA)', () => {
  test('login', async ({ page }) => {
    await page.goto('/login');
    await expectNoViolations(page);
  });

  test('login con error de validación', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email o teléfono').fill('no-es-un-handle');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expectNoViolations(page);
  });

  test('home cargado', async ({ page }) => {
    await login(page);
    await expectNoViolations(page);
  });

  test('home vacío', async ({ page }) => {
    await login(page);
    await forceWalletState(page, 'empty');
    await expect(page.getByText('Todavía no hay movimientos')).toBeVisible();
    await expectNoViolations(page);
  });

  test('home con error', async ({ page }) => {
    await login(page);
    await forceWalletState(page, 'error');
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expectNoViolations(page);
  });

  test('transferencia paso 1', async ({ page }) => {
    await login(page);
    await page.goto('/transfer');
    await expectNoViolations(page);
  });

  test('transferencia paso 1 con errores de validación', async ({ page }) => {
    await login(page);
    await page.goto('/transfer');
    await page.getByRole('button', { name: /Lucía Fernández/ }).click();
    await page.getByLabel('Monto a enviar').fill('999999');
    await page.getByLabel('Monto a enviar').blur();
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expectNoViolations(page);
  });

  test('transferencia paso 1, contacto manual', async ({ page }) => {
    await login(page);
    await page.goto('/transfer');
    await page.getByRole('tab', { name: 'Nuevo contacto' }).click();
    await expectNoViolations(page);
  });

  test('transferencia paso 2 (resumen)', async ({ page }) => {
    await login(page);
    await page.goto('/transfer');
    await page.getByRole('button', { name: /Lucía Fernández/ }).click();
    await page.getByLabel('Monto a enviar').fill('25.50');
    await page.getByTestId('continue').click();
    await expect(page.getByTestId('summary-amount')).toBeVisible();
    await expectNoViolations(page);
  });

  test('transferencia paso 2 con fallo', async ({ page }) => {
    await login(page);
    await page.goto('/transfer');
    await page.getByRole('button', { name: /Lucía Fernández/ }).click();
    await page.getByLabel('Monto a enviar').fill('25.50');
    await page.getByTestId('continue').click();
    await forceOutcome(page, 'NETWORK_ERROR');
    await page.getByTestId('confirm').click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expectNoViolations(page);
  });

  test('comprobante', async ({ page }) => {
    await login(page);
    await page.goto('/transfer');
    await page.getByRole('button', { name: /Lucía Fernández/ }).click();
    await page.getByLabel('Monto a enviar').fill('10.00');
    await page.getByTestId('continue').click();
    await forceOutcome(page, 'SUCCESS');
    await page.getByTestId('confirm').click();
    await expect(page).toHaveURL(/\/receipt\//);
    await expectNoViolations(page);
  });

  test('el foco se mueve al paso 2 al continuar', async ({ page }) => {
    await login(page);
    await page.goto('/transfer');
    await page.getByRole('button', { name: /Lucía Fernández/ }).click();
    await page.getByLabel('Monto a enviar').fill('25.50');
    await page.getByTestId('continue').click();
    await expect(page.getByTestId('summary-amount')).toBeVisible();

    const focused = await page.evaluate(() => document.activeElement?.textContent ?? '');
    expect(focused).toContain('Paso 2 de 2');
  });

  test('los cambios de estado de Home se anuncian', async ({ page }) => {
    await login(page);
    const live = page.locator('[aria-live="polite"]').first();
    await expect(live).toContainText('Cartera digital actualizada');
  });

  test('página no encontrada', async ({ page }) => {
    await login(page);
    await page.goto('/receipt/txn_inexistente');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoViolations(page);
  });
});
