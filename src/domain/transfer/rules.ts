import { handlesMatch, isValidHandle } from '../handle';
import type { TransferRecipient } from '../models';
import { type Cents, cents, parseAmount } from '../money';
import type { TransferViolation } from './violations';

export const PER_TRANSACTION_LIMIT: Cents = cents(500_000_00);

export interface TransferDraft {
  readonly amountInput: string;
  readonly recipient: TransferRecipient | null;
  readonly note: string;
}

export interface TransferCommand {
  readonly amount: Cents;
  readonly recipient: TransferRecipient;
  readonly note: string | null;
}

export interface TransferContext {
  readonly availableBalance: Cents;
  readonly ownHandles: readonly string[];
  readonly limit?: Cents;
}

export type TransferValidation =
  | { readonly ok: true; readonly command: TransferCommand }
  | { readonly ok: false; readonly violations: readonly TransferViolation[] };

export function validateTransfer(
  draft: TransferDraft,
  context: TransferContext,
): TransferValidation {
  const violations: TransferViolation[] = [];
  const limit = context.limit ?? PER_TRANSACTION_LIMIT;

  const parsed = parseAmount(draft.amountInput);
  let amount: Cents | null = null;

  if (!parsed.ok) {
    switch (parsed.error) {
      case 'EMPTY':
        violations.push({ code: 'AMOUNT_REQUIRED' });
        break;
      case 'TOO_MANY_DECIMALS':
        violations.push({ code: 'AMOUNT_TOO_MANY_DECIMALS' });
        break;
      case 'NEGATIVE':
        violations.push({ code: 'AMOUNT_NOT_POSITIVE' });
        break;
      default:
        violations.push({ code: 'AMOUNT_INVALID' });
    }
  } else if (parsed.value <= 0) {
    violations.push({ code: 'AMOUNT_NOT_POSITIVE' });
  } else {
    amount = parsed.value;

    if (amount > context.availableBalance) {
      violations.push({
        code: 'AMOUNT_EXCEEDS_BALANCE',
        requested: amount,
        available: context.availableBalance,
      });
    }

    if (amount > limit) {
      violations.push({ code: 'AMOUNT_ABOVE_LIMIT', requested: amount, limit });
    }
  }

  const { recipient } = draft;

  if (recipient === null || recipient.name.trim() === '' || recipient.handle.trim() === '') {
    violations.push({ code: 'RECIPIENT_REQUIRED' });
  } else if (!isValidHandle(recipient.handle)) {
    violations.push({ code: 'RECIPIENT_INVALID' });
  } else if (context.ownHandles.some((own) => handlesMatch(own, recipient.handle))) {
    violations.push({ code: 'RECIPIENT_IS_SELF' });
  }

  if (violations.length > 0 || amount === null || recipient === null) {
    return { ok: false, violations };
  }

  const note = draft.note.trim();
  return {
    ok: true,
    command: {
      amount,
      recipient: { ...recipient, name: recipient.name.trim(), handle: recipient.handle.trim() },
      note: note === '' ? null : note,
    },
  };
}
