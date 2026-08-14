import type { Brand } from './brand';

export type Cents = Brand<number, 'Cents'>;

export const ZERO: Cents = 0 as Cents;

export function cents(value: number): Cents {
  if (!Number.isInteger(value)) {
    throw new TypeError(`Money must be an integer number of cents, received ${value}`);
  }
  return value as Cents;
}

export function addCents(a: Cents, b: Cents): Cents {
  return (a + b) as Cents;
}

export function subtractCents(a: Cents, b: Cents): Cents {
  return (a - b) as Cents;
}

export type CurrencyCode = 'USD';

export const DEFAULT_CURRENCY: CurrencyCode = 'USD';

const MAX_MAJOR_UNITS = 1_000_000_000_000;

export type AmountParseError =
  'EMPTY' | 'NOT_A_NUMBER' | 'TOO_MANY_DECIMALS' | 'TOO_LARGE' | 'NEGATIVE';

export type AmountParseResult =
  | { readonly ok: true; readonly value: Cents }
  | { readonly ok: false; readonly error: AmountParseError };

export function parseAmount(raw: string): AmountParseResult {
  const trimmed = raw.trim().replace(/\s/g, '');

  if (trimmed === '') return { ok: false, error: 'EMPTY' };
  if (trimmed.startsWith('-')) return { ok: false, error: 'NEGATIVE' };

  const match = /^(\d+)(?:[.,](\d*))?$/.exec(trimmed);
  if (!match) return { ok: false, error: 'NOT_A_NUMBER' };

  const whole = match[1] ?? '';
  const fraction = match[2] ?? '';

  if (fraction.length > 2) return { ok: false, error: 'TOO_MANY_DECIMALS' };
  if (Number(whole) >= MAX_MAJOR_UNITS) return { ok: false, error: 'TOO_LARGE' };

  const normalisedFraction = fraction.padEnd(2, '0');
  return { ok: true, value: cents(Number(whole) * 100 + Number(normalisedFraction)) };
}

/** Digits allowed before the separator, matching `MAX_MAJOR_UNITS`. */
const MAX_WHOLE_DIGITS = 12;

/**
 * Filters raw keystrokes down to something that can only ever be a money amount.
 *
 * `parseAmount` still rejects anything malformed, and the API validates independently —
 * this exists so the field never *accepts* a character it would later complain about.
 * Typing a letter is a no-op rather than an error message.
 */
export function sanitizeAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.,]/g, '');
  const separatorAt = cleaned.search(/[.,]/);

  if (separatorAt === -1) return cleaned.slice(0, MAX_WHOLE_DIGITS);

  const separator = cleaned.charAt(separatorAt);
  const whole = cleaned.slice(0, separatorAt).slice(0, MAX_WHOLE_DIGITS) || '0';
  const fraction = cleaned
    .slice(separatorAt + 1)
    .replace(/[.,]/g, '')
    .slice(0, 2);

  return `${whole}${separator}${fraction}`;
}

export function formatMoney(value: Cents, currency: CurrencyCode = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value / 100);
}

export function formatSignedMoney(
  value: Cents,
  direction: 'credit' | 'debit',
  currency: CurrencyCode = DEFAULT_CURRENCY,
): string {
  const sign = direction === 'credit' ? '+' : '-';
  return `${sign}${formatMoney(value, currency)}`;
}
