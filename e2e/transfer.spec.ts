import { expect, type Page, test } from '@playwright/test';

import { appAlert, forceOutcome, login, readBalanceCents } from './helpers';

async function startTransfer(page: Page, amount: string, contact = 'Lucía Fernández') {
  await page.goto('/transfer');
  await page.getByRole('button', { name: new RegExp(contact) }).click();
  await page.getByLabel('Monto a enviar').fill(amount);
  await page.getByTestId('continue').click();
  await expect(page.getByTestId('summary-amount')).toBeVisible();
}

test.describe('Nueva transacción', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('reglas de negocio', () => {
    test('no permite continuar sin destinatario', async ({ page }) => {
      await page.goto('/transfer');
      await page.getByLabel('Monto a enviar').fill('25');

      await expect(page.getByTestId('continue')).toBeDisabled();
    });

    test('no permite continuar sin monto', async ({ page }) => {
      await page.goto('/transfer');
      await page.getByRole('button', { name: /Lucía Fernández/ }).click();

      await expect(page.getByTestId('continue')).toBeDisabled();
    });

    test('el campo de monto no acepta letras', async ({ page }) => {
      await page.goto('/transfer');
      const amount = page.getByLabel('Monto a enviar');

      await amount.pressSequentially('abc');
      await expect(amount).toHaveValue('');

      await amount.pressSequentially('1a2b.5c9');
      await expect(amount).toHaveValue('12.59');
    });

    test('rechaza monto cero', async ({ page }) => {
      await page.goto('/transfer');
      await page.getByRole('button', { name: /Lucía Fernández/ }).click();
      await page.getByLabel('Monto a enviar').fill('0');
      await page.getByLabel('Monto a enviar').blur();

      await expect(appAlert(page)).toContainText('El monto debe ser mayor a cero.');
      await expect(page.getByTestId('continue')).toBeDisabled();
    });

    test('rechaza un monto mayor al saldo', async ({ page }) => {
      await page.goto('/transfer');
      await page.getByRole('button', { name: /Lucía Fernández/ }).click();
      await page.getByLabel('Monto a enviar').fill('999999');
      await page.getByLabel('Monto a enviar').blur();

      await expect(appAlert(page)).toContainText('Saldo insuficiente');
      await expect(page.getByTestId('continue')).toBeDisabled();
    });
  });

  test('permite ingresar un contacto nuevo manualmente', async ({ page }) => {
    await page.goto('/transfer');
    await page.getByRole('tab', { name: 'Nuevo contacto' }).click();
    await page.getByLabel('Nombre').fill('Ana Pérez');
    await page.getByLabel('Email o teléfono').fill('ana@example.com');
    await page.getByLabel('Monto a enviar').fill('15.50');

    await page.getByTestId('continue').click();

    await expect(page.getByTestId('summary-recipient')).toHaveText('Ana Pérez');
    await expect(page.getByTestId('summary-amount')).toHaveText('$15.50');
  });

  test('muestra el resumen antes de confirmar y permite volver', async ({ page }) => {
    await startTransfer(page, '42.75');

    await expect(page.getByTestId('summary-amount')).toHaveText('$42.75');
    await expect(page.getByTestId('summary-recipient')).toHaveText('Lucía Fernández');

    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page.getByLabel('Monto a enviar')).toHaveValue('42.75');
  });

  test('el botón Atrás del navegador vuelve al paso 1, no fuera del flujo', async ({ page }) => {
    await startTransfer(page, '42.75');
    await expect(page).toHaveURL(/\/transfer\?step=review$/);

    await page.goBack();

    await expect(page).toHaveURL(/\/transfer$/);
    await expect(page.getByLabel('Monto a enviar')).toHaveValue('42.75');
    await expect(page.getByTestId('summary-amount')).toBeHidden();
  });

  test('el botón Volver del resumen se comporta igual que Atrás', async ({ page }) => {
    await startTransfer(page, '18.00');
    await page.getByRole('button', { name: 'Volver' }).click();

    await expect(page).toHaveURL(/\/transfer$/);
    await expect(page.getByLabel('Monto a enviar')).toHaveValue('18.00');
  });

  test('desde el paso 1, Atrás sale del flujo', async ({ page }) => {
    await page.goto('/home');
    await page.getByRole('link', { name: 'Nueva transacción' }).click();
    await expect(page).toHaveURL(/\/transfer$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/home$/);
  });

  test('camino feliz: confirma, muestra comprobante y descuenta el saldo', async ({ page }) => {
    const before = await readBalanceCents(page);

    await startTransfer(page, '30.00');
    await forceOutcome(page, 'SUCCESS');
    await page.getByTestId('confirm').click();

    await expect(page).toHaveURL(/\/receipt\//);
    await expect(page.getByTestId('receipt-title')).toHaveText('Transferencia enviada');
    await expect(page.getByTestId('receipt-amount')).toHaveText('$30.00');

    await page.getByRole('link', { name: 'Volver al inicio' }).click();
    await expect(page).toHaveURL(/\/home$/);
    expect(await readBalanceCents(page)).toBe(before - 3000);
  });

  test('el comprobante sobrevive a un refresh', async ({ page }) => {
    await startTransfer(page, '5.00');
    await forceOutcome(page, 'SUCCESS');
    await page.getByTestId('confirm').click();

    await expect(page).toHaveURL(/\/receipt\//);
    const url = page.url();

    await page.reload();
    await expect(page.getByTestId('receipt-amount')).toHaveText('$5.00');
    expect(page.url()).toBe(url);
  });

  test('el movimiento aparece en el historial', async ({ page }) => {
    await startTransfer(page, '7.25', 'Martín Suárez');
    await forceOutcome(page, 'SUCCESS');
    await page.getByTestId('confirm').click();

    await expect(page).toHaveURL(/\/receipt\//);
    await page.goto('/home');

    const first = page.getByTestId('movement-list').getByRole('listitem').first();
    await expect(first).toContainText('Martín Suárez');
    await expect(first).toContainText('-$7.25');
  });
});

test.describe('Escenarios de confirmación', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  const retryable = [
    { outcome: 'NETWORK_ERROR' as const, title: 'Error de red' },
    { outcome: 'TIMEOUT' as const, title: 'La operación tardó demasiado' },
    { outcome: 'UNKNOWN_ERROR' as const, title: 'Algo salió mal' },
  ];

  for (const scenario of retryable) {
    test(`${scenario.outcome}: muestra el error y permite reintentar`, async ({ page }) => {
      await startTransfer(page, '12.00');
      await forceOutcome(page, scenario.outcome);
      await page.getByTestId('confirm').click();

      await expect(appAlert(page)).toContainText(scenario.title);
      await expect(page.getByTestId('confirm')).toBeEnabled();

      await forceOutcome(page, 'SUCCESS');
      await page.getByTestId('confirm').click();
      await expect(page).toHaveURL(/\/receipt\//);
    });
  }

  test('Fondos insuficientes: error descriptivo y sin invitación a reintentar', async ({
    page,
  }) => {
    await startTransfer(page, '12.00');
    await forceOutcome(page, 'INSUFFICIENT_FUNDS');
    await page.getByTestId('confirm').click();

    const alert = appAlert(page);
    await expect(alert).toContainText('Fondos insuficientes');
    await expect(alert).toContainText('Modifica la transferencia antes de volver a intentar.');
  });

  test('un fallo no mueve el dinero', async ({ page }) => {
    const before = await readBalanceCents(page);

    await startTransfer(page, '20.00');
    await forceOutcome(page, 'NETWORK_ERROR');
    await page.getByTestId('confirm').click();
    await expect(appAlert(page)).toBeVisible();

    await page.goto('/home');
    expect(await readBalanceCents(page)).toBe(before);
  });
});
