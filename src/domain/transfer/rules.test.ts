import { describe, expect, it } from 'vitest';

import type { ContactId, TransferRecipient } from '../models';
import { type Cents, cents } from '../money';
import { PER_TRANSACTION_LIMIT, type TransferDraft, validateTransfer } from './rules';
import type { TransferViolationCode } from './violations';

const BALANCE: Cents = cents(1_000_00);

const CONTACT: TransferRecipient = {
  contactId: 'con_1' as ContactId,
  name: 'Lucía Fernández',
  handle: 'lucia@example.com',
};

function draft(overrides: Partial<TransferDraft> = {}): TransferDraft {
  return { amountInput: '10.00', recipient: CONTACT, note: '', ...overrides };
}

function codesFor(
  input: Partial<TransferDraft>,
  balance: Cents = BALANCE,
): TransferViolationCode[] {
  const result = validateTransfer(draft(input), {
    availableBalance: balance,
    ownHandles: ['demo@wallet.com', '+15555550100'],
  });
  return result.ok ? [] : result.violations.map((violation) => violation.code);
}

describe('validateTransfer', () => {
  describe('rule 1 — amount must be present and positive', () => {
    it('rejects an empty amount', () => {
      expect(codesFor({ amountInput: '' })).toContain('AMOUNT_REQUIRED');
    });

    it('rejects zero', () => {
      expect(codesFor({ amountInput: '0' })).toContain('AMOUNT_NOT_POSITIVE');
      expect(codesFor({ amountInput: '0.00' })).toContain('AMOUNT_NOT_POSITIVE');
    });

    it('rejects a negative amount', () => {
      expect(codesFor({ amountInput: '-5' })).toContain('AMOUNT_NOT_POSITIVE');
    });

    it('rejects text and malformed numbers', () => {
      expect(codesFor({ amountInput: 'abc' })).toContain('AMOUNT_INVALID');
      expect(codesFor({ amountInput: '1.2.3' })).toContain('AMOUNT_INVALID');
      expect(codesFor({ amountInput: '12abc' })).toContain('AMOUNT_INVALID');
    });

    it('rejects sub-cent precision instead of rounding it away', () => {
      expect(codesFor({ amountInput: '10.999' })).toContain('AMOUNT_TOO_MANY_DECIMALS');
    });
  });

  describe('rule 2 — amount cannot exceed the available balance', () => {
    it('rejects more than the balance', () => {
      expect(codesFor({ amountInput: '1000.01' })).toContain('AMOUNT_EXCEEDS_BALANCE');
    });

    it('allows spending the balance down to exactly zero', () => {
      expect(codesFor({ amountInput: '1000.00' })).toEqual([]);
    });

    it('reports the numbers the message needs', () => {
      const result = validateTransfer(draft({ amountInput: '2000' }), {
        availableBalance: BALANCE,
        ownHandles: [],
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;

      const violation = result.violations.find((item) => item.code === 'AMOUNT_EXCEEDS_BALANCE');
      expect(violation).toEqual({
        code: 'AMOUNT_EXCEEDS_BALANCE',
        requested: 200_000,
        available: 100_000,
      });
    });
  });

  describe('rule 3 — a recipient is mandatory', () => {
    it('rejects a missing recipient', () => {
      expect(codesFor({ recipient: null })).toContain('RECIPIENT_REQUIRED');
    });

    it('rejects a recipient with a blank name', () => {
      expect(codesFor({ recipient: { ...CONTACT, name: '   ' } })).toContain('RECIPIENT_REQUIRED');
    });

    it('rejects an unusable handle', () => {
      expect(codesFor({ recipient: { ...CONTACT, handle: 'not-a-handle' } })).toContain(
        'RECIPIENT_INVALID',
      );
    });

    it('rejects sending money to yourself', () => {
      expect(codesFor({ recipient: { ...CONTACT, handle: 'demo@wallet.com' } })).toContain(
        'RECIPIENT_IS_SELF',
      );
    });

    it('detects self-transfer regardless of case or phone formatting', () => {
      expect(codesFor({ recipient: { ...CONTACT, handle: 'DEMO@Wallet.com' } })).toContain(
        'RECIPIENT_IS_SELF',
      );
      expect(codesFor({ recipient: { ...CONTACT, handle: '+1 (555) 555-0100' } })).toContain(
        'RECIPIENT_IS_SELF',
      );
    });
  });

  describe('per-transaction limit', () => {
    it('rejects an amount above the ceiling even when the balance covers it', () => {
      const huge = cents(PER_TRANSACTION_LIMIT + 1);
      const codes = codesFor({ amountInput: '500000.01' }, huge);
      expect(codes).toContain('AMOUNT_ABOVE_LIMIT');
      expect(codes).not.toContain('AMOUNT_EXCEEDS_BALANCE');
    });
  });

  describe('reporting', () => {
    it('returns every violation at once rather than stopping at the first', () => {
      const codes = codesFor({ amountInput: '0', recipient: null });
      expect(codes).toEqual(expect.arrayContaining(['AMOUNT_NOT_POSITIVE', 'RECIPIENT_REQUIRED']));
      expect(codes).toHaveLength(2);
    });
  });

  describe('on success it parses rather than merely approves', () => {
    it('hands back an exact-cents command', () => {
      const result = validateTransfer(draft({ amountInput: '10.99' }), {
        availableBalance: BALANCE,
        ownHandles: [],
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.command.amount).toBe(1099);
      expect(result.command.recipient.name).toBe('Lucía Fernández');
    });

    it('normalises an empty note to null and trims the recipient', () => {
      const result = validateTransfer(
        draft({ note: '   ', recipient: { ...CONTACT, name: '  Ana  ' } }),
        { availableBalance: BALANCE, ownHandles: [] },
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.command.note).toBeNull();
      expect(result.command.recipient.name).toBe('Ana');
    });

    it('keeps a real note', () => {
      const result = validateTransfer(draft({ note: ' Cena ' }), {
        availableBalance: BALANCE,
        ownHandles: [],
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.command.note).toBe('Cena');
    });
  });
});
