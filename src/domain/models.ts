import type { Brand } from './brand';
import type { Cents, CurrencyCode } from './money';

export type UserId = Brand<string, 'UserId'>;
export type ContactId = Brand<string, 'ContactId'>;
export type MovementId = Brand<string, 'MovementId'>;
export type TransactionId = Brand<string, 'TransactionId'>;

export type Handle = string;

export interface User {
  readonly id: UserId;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
}

export interface Account {
  readonly userId: UserId;
  readonly balance: Cents;
  readonly currency: CurrencyCode;
}

export type MovementDirection = 'credit' | 'debit';

export type MovementStatus = 'settled' | 'pending';

export interface Movement {
  readonly id: MovementId;
  readonly description: string;
  readonly counterparty: string;
  readonly amount: Cents;
  readonly direction: MovementDirection;
  readonly status: MovementStatus;
  readonly createdAt: string;
}

export interface Contact {
  readonly id: ContactId;
  readonly name: string;
  readonly handle: Handle;
  readonly isFavorite: boolean;
}

export interface TransferRecipient {
  readonly contactId: ContactId | null;
  readonly name: string;
  readonly handle: Handle;
}

export interface Receipt {
  readonly transactionId: TransactionId;
  readonly reference: string;
  readonly amount: Cents;
  readonly currency: CurrencyCode;
  readonly recipient: TransferRecipient;
  readonly note: string | null;
  readonly createdAt: string;
  readonly balanceAfter: Cents;
}

export interface WalletSnapshot {
  readonly user: User;
  readonly account: Account;
  readonly movements: readonly Movement[];
}
