import { expect, type Page, test } from '@playwright/test';

import { forceOutcome, login } from './helpers';

const VIEWPORTS = [
  { name: 'iPhone SE (320px)', width: 320, height: 568 },
  { name: 'móvil (390px)', width: 390, height: 844 },
  { name: 'tablet (768px)', width: 768, height: 1024 },
  { name: 'desktop (1440px)', width: 1440, height: 900 },
] as const;

async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 1;
  });
}

/**
 * Reports the first element whose RIGHT EDGE passes the viewport.
 *
 * Comparing widths alone is not enough: an element narrower than the viewport can still
 * overflow if it is offset or absolutely positioned. That gap once hid a broken
 * `box-sizing` reset, where every page container was exactly its padding too wide.
 */
async function overflowingElement(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const limit = document.documentElement.clientWidth;
    for (const el of Array.from(document.querySelectorAll('*'))) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.right > limit + 1) {
        return `${el.tagName.toLowerCase()}.${el.className} right=${Math.round(rect.right)} > ${limit}`;
      }
    }
    return null;
  });
}

test.describe('Diseño responsivo', () => {
  for (const viewport of VIEWPORTS) {
    test(`${viewport.name}: ninguna pantalla desborda horizontalmente`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await page.goto('/login');
      expect(await overflowingElement(page)).toBeNull();
      expect(await hasHorizontalOverflow(page)).toBe(false);

      await login(page);
      expect(await overflowingElement(page)).toBeNull();
      expect(await hasHorizontalOverflow(page)).toBe(false);

      await page.goto('/transfer');
      await page.getByRole('button', { name: /Lucía Fernández/ }).click();
      await page.getByLabel('Monto a enviar').fill('1234.56');
      expect(await overflowingElement(page)).toBeNull();

      await page.getByTestId('continue').click();
      await expect(page.getByTestId('summary-amount')).toBeVisible();
      expect(await overflowingElement(page)).toBeNull();
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }

  test('un destinatario con datos largos no rompe el resumen', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await login(page);

    await page.goto('/transfer');
    await page.getByRole('tab', { name: 'Nuevo contacto' }).click();
    await page.getByLabel('Nombre').fill('María Fernanda de la Cruz Villalobos');
    await page.getByLabel('Email o teléfono').fill('maria.fernanda.delacruz@empresa-muy-larga.com');
    await page.getByLabel('Monto a enviar').fill('999.99');
    await page.getByTestId('continue').click();

    await expect(page.getByTestId('summary-amount')).toBeVisible();
    expect(await overflowingElement(page)).toBeNull();
  });

  test('el comprobante se lee bien en móvil chico', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await login(page);

    await page.goto('/transfer');
    await page.getByRole('button', { name: /Lucía Fernández/ }).click();
    await page.getByLabel('Monto a enviar').fill('12.34');
    await page.getByTestId('continue').click();
    await forceOutcome(page, 'SUCCESS');
    await page.getByTestId('confirm').click();

    await expect(page).toHaveURL(/\/receipt\//);
    await expect(page.getByTestId('receipt-amount')).toHaveText('$12.34');
    expect(await overflowingElement(page)).toBeNull();
  });

  test('los botones cumplen el tamaño mínimo táctil en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await login(page);

    const cta = page.getByRole('link', { name: 'Nueva transacción' });
    const box = await cta.boundingBox();

    expect(box).not.toBeNull();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});
