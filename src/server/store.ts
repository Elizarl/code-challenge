import type {
  Account,
  Contact,
  ContactId,
  Movement,
  MovementId,
  Receipt,
  TransactionId,
  User,
  UserId,
  WalletSnapshot,
} from '@/domain/models';
import { addCents, type Cents, cents, DEFAULT_CURRENCY, subtractCents } from '@/domain/money';
import type { TransferCommand } from '@/domain/transfer/rules';

const DEMO_USER_ID = 'usr_demo_001' as UserId;

const DEMO_USER: User = {
  id: DEMO_USER_ID,
  fullName: 'Paola Elizalde',
  email: 'demo@wallet.com',
  phone: '+15555550100',
};

interface WalletState {
  readonly users: Map<UserId, User>;
  readonly accounts: Map<UserId, Account>;
  readonly movements: Map<UserId, Movement[]>;
  readonly contacts: Map<UserId, Contact[]>;
  readonly receipts: Map<TransactionId, Receipt>;
  readonly idempotency: Map<string, TransactionId>;
}

function daysAgo(days: number, hours = 0): string {
  const date = new Date('2026-08-12T15:00:00.000Z');
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(date.getUTCHours() - hours);
  return date.toISOString();
}

function seed(): WalletState {
  const movements: Movement[] = [
    {
      id: 'mov_001' as MovementId,
      description: 'Pago de nómina',
      counterparty: 'Acme Corp',
      amount: cents(3_200_00),
      direction: 'credit',
      status: 'settled',
      createdAt: daysAgo(1),
    },
    {
      id: 'mov_002' as MovementId,
      description: 'Transferencia enviada',
      counterparty: 'Lucía Fernández',
      amount: cents(150_00),
      direction: 'debit',
      status: 'settled',
      createdAt: daysAgo(2, 3),
    },
    {
      id: 'mov_003' as MovementId,
      description: 'Suscripción mensual',
      counterparty: 'Streaming Plus',
      amount: cents(12_99),
      direction: 'debit',
      status: 'settled',
      createdAt: daysAgo(4),
    },
    {
      id: 'mov_004' as MovementId,
      description: 'Reembolso',
      counterparty: 'Tienda Online',
      amount: cents(89_50),
      direction: 'credit',
      status: 'pending',
      createdAt: daysAgo(6, 5),
    },
    {
      id: 'mov_005' as MovementId,
      description: 'Transferencia enviada',
      counterparty: 'Martín Suárez',
      amount: cents(420_00),
      direction: 'debit',
      status: 'settled',
      createdAt: daysAgo(9),
    },
  ];

  const contacts: Contact[] = [
    {
      id: 'con_001' as ContactId,
      name: 'Lucía Fernández',
      handle: 'lucia@example.com',
      isFavorite: true,
    },
    { id: 'con_002' as ContactId, name: 'Martín Suárez', handle: '+15555550111', isFavorite: true },
    {
      id: 'con_003' as ContactId,
      name: 'Camila Rojas',
      handle: 'camila@example.com',
      isFavorite: true,
    },
    { id: 'con_004' as ContactId, name: 'Diego Ortiz', handle: '+15555550133', isFavorite: false },
  ];

  return {
    users: new Map([[DEMO_USER_ID, DEMO_USER]]),
    accounts: new Map([
      [
        DEMO_USER_ID,
        { userId: DEMO_USER_ID, balance: cents(4_850_75), currency: DEFAULT_CURRENCY },
      ],
    ]),
    movements: new Map([[DEMO_USER_ID, movements]]),
    contacts: new Map([[DEMO_USER_ID, contacts]]),
    receipts: new Map(),
    idempotency: new Map(),
  };
}

const globalForStore = globalThis as typeof globalThis & { __walletState?: WalletState };

function state(): WalletState {
  globalForStore.__walletState ??= seed();
  return globalForStore.__walletState;
}

export function resetStore(): void {
  globalForStore.__walletState = seed();
}

export function getDemoUserId(): UserId {
  return DEMO_USER_ID;
}

export function findUser(userId: UserId): User | null {
  return state().users.get(userId) ?? null;
}

export function getAccount(userId: UserId): Account | null {
  return state().accounts.get(userId) ?? null;
}

export function listMovements(userId: UserId): readonly Movement[] {
  const movements = state().movements.get(userId) ?? [];
  return [...movements].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getSnapshot(userId: UserId): WalletSnapshot | null {
  const user = findUser(userId);
  const account = getAccount(userId);
  if (user === null || account === null) return null;
  return { user, account, movements: listMovements(userId) };
}

export function listContacts(userId: UserId): readonly Contact[] {
  const contacts = state().contacts.get(userId) ?? [];
  return [...contacts].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function saveContact(
  userId: UserId,
  input: { name: string; handle: string; isFavorite?: boolean },
): Contact {
  const contacts = state().contacts.get(userId) ?? [];

  const existing = contacts.find(
    (contact) => contact.handle.toLowerCase() === input.handle.toLowerCase(),
  );
  if (existing) return existing;

  const contact: Contact = {
    id: `con_${crypto.randomUUID()}` as ContactId,
    name: input.name,
    handle: input.handle,
    isFavorite: input.isFavorite ?? false,
  };

  state().contacts.set(userId, [...contacts, contact]);
  return contact;
}

export interface TransferResult {
  readonly receipt: Receipt;
  readonly account: Account;
}

export function executeTransfer(
  userId: UserId,
  command: TransferCommand,
  idempotencyKey?: string,
): TransferResult | null {
  if (idempotencyKey !== undefined) {
    const existingId = state().idempotency.get(idempotencyKey);
    if (existingId !== undefined) {
      const receipt = state().receipts.get(existingId);
      const account = getAccount(userId);
      if (receipt !== undefined && account !== null) return { receipt, account };
    }
  }

  const account = getAccount(userId);
  if (account === null) return null;
  if (command.amount > account.balance) return null;

  const now = new Date().toISOString();
  const transactionId = `txn_${crypto.randomUUID()}` as TransactionId;
  const balanceAfter = subtractCents(account.balance, command.amount);

  const updatedAccount: Account = { ...account, balance: balanceAfter };
  state().accounts.set(userId, updatedAccount);

  const movement: Movement = {
    id: `mov_${crypto.randomUUID()}` as MovementId,
    description: 'Transferencia enviada',
    counterparty: command.recipient.name,
    amount: command.amount,
    direction: 'debit',
    status: 'settled',
    createdAt: now,
  };
  state().movements.set(userId, [movement, ...(state().movements.get(userId) ?? [])]);

  const receipt: Receipt = {
    transactionId,
    reference: buildReference(),
    amount: command.amount,
    currency: account.currency,
    recipient: command.recipient,
    note: command.note,
    createdAt: now,
    balanceAfter,
  };
  state().receipts.set(transactionId, receipt);

  if (idempotencyKey !== undefined) {
    state().idempotency.set(idempotencyKey, transactionId);
  }

  return { receipt, account: updatedAccount };
}

export function findReceipt(transactionId: TransactionId): Receipt | null {
  return state().receipts.get(transactionId) ?? null;
}

function buildReference(): string {
  return crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
}

export function creditAccount(userId: UserId, amount: Cents): void {
  const account = getAccount(userId);
  if (account === null) return;
  state().accounts.set(userId, { ...account, balance: addCents(account.balance, amount) });
}
