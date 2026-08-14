import { describe, expect, it } from 'vitest';

import { cents, formatMoney, formatSignedMoney, parseAmount, sanitizeAmountInput } from './money';

describe('parseAmount', () => {
  it('parses whole numbers into cents', () => {
    expect(parseAmount('25')).toEqual({ ok: true, value: 2500 });
  });

  it('parses one and two decimal places', () => {
    expect(parseAmount('25.5')).toEqual({ ok: true, value: 2550 });
    expect(parseAmount('25.50')).toEqual({ ok: true, value: 2550 });
    expect(parseAmount('0.07')).toEqual({ ok: true, value: 7 });
  });

  it('accepts a comma as the decimal separator', () => {
    expect(parseAmount('25,50')).toEqual({ ok: true, value: 2550 });
  });

  it('ignores spaces used as thousands separators', () => {
    expect(parseAmount(' 1 234.50 ')).toEqual({ ok: true, value: 123_450 });
  });

  it('avoids the float rounding that decimal money is famous for', () => {
    const a = parseAmount('0.1');
    const b = parseAmount('0.2');
    expect(a.ok && b.ok && a.value + b.value).toBe(30);
  });

  it('rejects empty input', () => {
    expect(parseAmount('')).toEqual({ ok: false, error: 'EMPTY' });
    expect(parseAmount('   ')).toEqual({ ok: false, error: 'EMPTY' });
  });

  it('rejects negatives', () => {
    expect(parseAmount('-1')).toEqual({ ok: false, error: 'NEGATIVE' });
  });

  it('rejects anything that is not a clean number', () => {
    expect(parseAmount('abc')).toEqual({ ok: false, error: 'NOT_A_NUMBER' });
    expect(parseAmount('12abc')).toEqual({ ok: false, error: 'NOT_A_NUMBER' });
    expect(parseAmount('1.2.3')).toEqual({ ok: false, error: 'NOT_A_NUMBER' });
    expect(parseAmount('1e3')).toEqual({ ok: false, error: 'NOT_A_NUMBER' });
  });

  it('rejects sub-cent precision rather than silently rounding', () => {
    expect(parseAmount('1.234')).toEqual({ ok: false, error: 'TOO_MANY_DECIMALS' });
  });

  it('rejects absurdly large amounts before they lose integer precision', () => {
    expect(parseAmount('1000000000000')).toEqual({ ok: false, error: 'TOO_LARGE' });
  });
});

describe('cents', () => {
  it('refuses fractional cents, which always mean a bug upstream', () => {
    expect(() => cents(10.5)).toThrow(TypeError);
  });
});

describe('formatMoney', () => {
  it('formats cents as currency', () => {
    expect(formatMoney(cents(123_456))).toBe('$1,234.56');
    expect(formatMoney(cents(0))).toBe('$0.00');
  });

  it('signs movements by direction', () => {
    expect(formatSignedMoney(cents(2500), 'credit')).toBe('+$25.00');
    expect(formatSignedMoney(cents(2500), 'debit')).toBe('-$25.00');
  });
});

describe('sanitizeAmountInput', () => {
  it('drops letters entirely', () => {
    expect(sanitizeAmountInput('abc')).toBe('');
    expect(sanitizeAmountInput('12abc')).toBe('12');
    expect(sanitizeAmountInput('a1b2c3')).toBe('123');
  });

  it('drops symbols and spaces', () => {
    expect(sanitizeAmountInput('$1 000')).toBe('1000');
    expect(sanitizeAmountInput('12-34')).toBe('1234');
    expect(sanitizeAmountInput('-5')).toBe('5');
  });

  it('keeps digits untouched', () => {
    expect(sanitizeAmountInput('1234')).toBe('1234');
  });

  it('accepts a single decimal separator, either style', () => {
    expect(sanitizeAmountInput('12.5')).toBe('12.5');
    expect(sanitizeAmountInput('12,5')).toBe('12,5');
  });

  it('keeps only the first separator', () => {
    expect(sanitizeAmountInput('1.2.3')).toBe('1.23');
    expect(sanitizeAmountInput('1,2,3')).toBe('1,23');
    expect(sanitizeAmountInput('1.2,3')).toBe('1.23');
  });

  it('caps the fraction at two digits', () => {
    expect(sanitizeAmountInput('1.2345')).toBe('1.23');
  });

  it('prefixes a bare separator with zero so it stays parseable', () => {
    expect(sanitizeAmountInput('.5')).toBe('0.5');
  });

  it('caps the whole part so it cannot exceed the parseable range', () => {
    expect(sanitizeAmountInput('1234567890123456')).toBe('123456789012');
  });

  it('produces output that parseAmount always accepts or reports as empty', () => {
    for (const raw of ['abc', '12abc', '$1 000', '1.2.3', '1.2345', '.5', '-5', '']) {
      const clean = sanitizeAmountInput(raw);
      const parsed = parseAmount(clean);
      expect(parsed.ok || parsed.error === 'EMPTY').toBe(true);
    }
  });
});
