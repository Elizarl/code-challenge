import type { Cents } from '../money';

export type TransferViolation =
  | { readonly code: 'AMOUNT_REQUIRED' }
  | { readonly code: 'AMOUNT_INVALID' }
  | { readonly code: 'AMOUNT_TOO_MANY_DECIMALS' }
  | { readonly code: 'AMOUNT_NOT_POSITIVE' }
  | {
      readonly code: 'AMOUNT_EXCEEDS_BALANCE';
      readonly requested: Cents;
      readonly available: Cents;
    }
  | { readonly code: 'AMOUNT_ABOVE_LIMIT'; readonly requested: Cents; readonly limit: Cents }
  | { readonly code: 'RECIPIENT_REQUIRED' }
  | { readonly code: 'RECIPIENT_INVALID' }
  | { readonly code: 'RECIPIENT_IS_SELF' };

export type TransferViolationCode = TransferViolation['code'];

export function violationField(violation: TransferViolation): 'amount' | 'recipient' {
  switch (violation.code) {
    case 'AMOUNT_REQUIRED':
    case 'AMOUNT_INVALID':
    case 'AMOUNT_TOO_MANY_DECIMALS':
    case 'AMOUNT_NOT_POSITIVE':
    case 'AMOUNT_EXCEEDS_BALANCE':
    case 'AMOUNT_ABOVE_LIMIT':
      return 'amount';
    case 'RECIPIENT_REQUIRED':
    case 'RECIPIENT_INVALID':
    case 'RECIPIENT_IS_SELF':
      return 'recipient';
  }
}
