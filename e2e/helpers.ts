import { expect, type Locator, type Page } from '@playwright/test';

export const DEMO_HANDLE = 'demo@wallet.com';

export type Outcome =
  'SUCCESS' | 'NETWORK_ERROR' | 'TIMEOUT' | 'INSUFFICIENT_FUNDS' | 'UNKNOWN_ERROR';

export type WalletState = 'empty' | 'error' | null;

/**
 * The app itself never forces an outcome: confirming a transfer is random, as the brief
 * requires. These helpers drive the server's simulation headers straight from the browser
 * context, so the suite stays deterministic without the product shipping a test hook in
 * its UI.
 */
const extraHeaders = new WeakMap<Page, Record<string, string>>();

async function applyHeaders(page: Page): Promise<void> {
  await page.setExtraHTTPHeaders(extraHeaders.get(page) ?? {});
}

export async function forceOutcome(page: Page, outcome: Outcome): Promise<void> {
  const headers = extraHeaders.get(page) ?? {};
  headers['x-simulate-outcome'] = outcome;
  extraHeaders.set(page, headers);
  await applyHeaders(page);
}

/** Sets the wallet simulation without reloading, so a retry can be observed recovering. */
export async function setWalletState(page: Page, state: WalletState): Promise<void> {
  const headers = extraHeaders.get(page) ?? {};
  delete headers['x-simulate-wallet-error'];
  delete headers['x-simulate-wallet-empty'];
  if (state === 'error') headers['x-simulate-wallet-error'] = '1';
  if (state === 'empty') headers['x-simulate-wallet-empty'] = '1';
  extraHeaders.set(page, headers);
  await applyHeaders(page);
}

/** Sets the wallet simulation and reloads so the panel refetches under it. */
export async function forceWalletState(page: Page, state: WalletState): Promise<void> {
  await setWalletState(page, state);
  await page.reload({ waitUntil: 'domcontentloaded' });
}

/**
 * The app's own alerts, excluding Next's route announcer.
 *
 * Next injects a permanently-mounted `<div role="alert" id="__next-route-announcer__">`
 * to announce client-side navigations to screen readers, so a bare `getByRole('alert')`
 * always matches at least two elements and trips Playwright's strict mode.
 */
export function appAlert(page: Page): Locator {
  return page.locator('[role="alert"]:not(#__next-route-announcer__)');
}

/** Signs in and waits for Home to have finished loading its data. */
export async function login(page: Page, handle: string = DEMO_HANDLE): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email o teléfono').fill(handle);
  await page.getByRole('button', { name: 'Ingresar' }).click();

  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByTestId('balance')).toBeVisible();
}

/** Reads the balance off Home as an integer number of cents. */
export async function readBalanceCents(page: Page): Promise<number> {
  const text = (await page.getByTestId('balance').textContent()) ?? '';
  const digits = text.replace(/[^0-9.]/g, '');
  return Math.round(Number(digits) * 100);
}
