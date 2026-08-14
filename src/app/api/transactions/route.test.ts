// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserId } from '@/domain/models';
import { encodeSession } from '@/server/session';
import { getAccount, getDemoUserId, resetStore } from '@/server/store';

let sessionCookie: string | undefined;

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) =>
        name === 'wallet_session' && sessionCookie !== undefined
          ? { name, value: sessionCookie }
          : undefined,
      set: vi.fn(),
      delete: vi.fn(),
    }),
}));

const { POST } = await import('./route');

interface ErrorBody {
  error: { code: string; message: string; violations?: { code: string }[] };
}

function post(body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  return POST(
    new Request('http://localhost/api/transactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
  );
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    amountInput: '25.00',
    recipient: { contactId: null, name: 'Ana Pérez', handle: 'ana@example.com' },
    note: '',
    saveRecipient: false,
    ...overrides,
  };
}

beforeEach(() => {
  resetStore();
  sessionCookie = encodeSession({
    userId: getDemoUserId(),
    handle: 'demo@wallet.com',
    issuedAt: new Date().toISOString(),
  });
});

describe('POST /api/transactions', () => {
  it('rejects an unauthenticated request', async () => {
    sessionCookie = undefined;

    const response = await post(validBody());
    expect(response.status).toBe(401);
  });

  it('rejects a malformed body', async () => {
    const response = await post({ nonsense: true });
    expect(response.status).toBe(400);
  });

  describe('business rules are enforced server-side', () => {
    it('rejects a zero amount even though the UI would never send one', async () => {
      const response = await post(validBody({ amountInput: '0' }));
      const body = (await response.json()) as ErrorBody;

      expect(response.status).toBe(422);
      expect(body.error.code).toBe('VALIDATION_FAILED');
      expect(body.error.violations?.map((v) => v.code)).toContain('AMOUNT_NOT_POSITIVE');
    });

    it('rejects a negative amount', async () => {
      const response = await post(validBody({ amountInput: '-100' }));
      expect(response.status).toBe(422);
    });

    it('rejects an amount above the balance with a 409, not a generic error', async () => {
      const response = await post(validBody({ amountInput: '99999.00' }));
      const body = (await response.json()) as ErrorBody;

      expect(response.status).toBe(409);
      expect(body.error.code).toBe('INSUFFICIENT_FUNDS');
    });

    it('rejects a missing recipient', async () => {
      const response = await post(
        validBody({ recipient: { contactId: null, name: '', handle: '' } }),
      );
      expect(response.status).toBe(400);
    });

    it('rejects a self-transfer', async () => {
      const response = await post(
        validBody({
          recipient: { contactId: null, name: 'Yo', handle: 'demo@wallet.com' },
        }),
      );
      const body = (await response.json()) as ErrorBody;

      expect(response.status).toBe(422);
      expect(body.error.violations?.map((v) => v.code)).toContain('RECIPIENT_IS_SELF');
    });

    it('leaves the balance untouched when a rule rejects the transfer', async () => {
      const before = getAccount(getDemoUserId())?.balance;
      await post(validBody({ amountInput: '99999.00' }));
      expect(getAccount(getDemoUserId())?.balance).toBe(before);
    });
  });

  describe('simulated outcomes', () => {
    it('debits the account and returns a receipt on success', async () => {
      const before = getAccount(getDemoUserId())?.balance ?? 0;

      const response = await post(validBody(), { 'x-simulate-outcome': 'SUCCESS' });
      const body = (await response.json()) as { receipt: { amount: number; reference: string } };

      expect(response.status).toBe(201);
      expect(body.receipt.amount).toBe(2500);
      expect(body.receipt.reference).toMatch(/^[0-9A-F]{12}$/);
      expect(getAccount(getDemoUserId())?.balance).toBe(before - 2500);
    });

    it.each([
      ['NETWORK_ERROR', 502],
      ['TIMEOUT', 504],
      ['INSUFFICIENT_FUNDS', 409],
      ['UNKNOWN_ERROR', 500],
    ])('maps %s to HTTP %i', async (outcome, status) => {
      const response = await post(validBody(), { 'x-simulate-outcome': outcome });
      expect(response.status).toBe(status);
    });

    it('does not move money when the simulated outcome is a failure', async () => {
      const before = getAccount(getDemoUserId())?.balance;
      await post(validBody(), { 'x-simulate-outcome': 'TIMEOUT' });
      expect(getAccount(getDemoUserId())?.balance).toBe(before);
    });
  });

  describe('idempotency', () => {
    it('replays the original receipt instead of sending twice', async () => {
      const before = getAccount(getDemoUserId())?.balance ?? 0;
      const headers = { 'x-simulate-outcome': 'SUCCESS', 'idempotency-key': 'key-abc' };

      const first = (await (await post(validBody(), headers)).json()) as {
        receipt: { transactionId: string };
      };
      const second = (await (await post(validBody(), headers)).json()) as {
        receipt: { transactionId: string };
      };

      expect(second.receipt.transactionId).toBe(first.receipt.transactionId);
      expect(getAccount(getDemoUserId())?.balance).toBe(before - 2500);
    });

    it('treats a different key as a genuinely new transfer', async () => {
      const before = getAccount(getDemoUserId())?.balance ?? 0;

      await post(validBody(), { 'x-simulate-outcome': 'SUCCESS', 'idempotency-key': 'key-1' });
      await post(validBody(), { 'x-simulate-outcome': 'SUCCESS', 'idempotency-key': 'key-2' });

      expect(getAccount(getDemoUserId())?.balance).toBe(before - 5000);
    });
  });

  it('saves a new recipient when asked', async () => {
    const response = await post(validBody({ saveRecipient: true }), {
      'x-simulate-outcome': 'SUCCESS',
    });
    const body = (await response.json()) as {
      savedContactId: string | null;
      contacts: { handle: string }[];
    };

    expect(body.savedContactId).not.toBeNull();
    expect(body.contacts.map((contact) => contact.handle)).toContain('ana@example.com');
  });

  it('does not save the recipient when not asked', async () => {
    const response = await post(validBody({ saveRecipient: false }), {
      'x-simulate-outcome': 'SUCCESS',
    });
    const body = (await response.json()) as { contacts: { handle: string }[] };

    expect(body.contacts.map((contact) => contact.handle)).not.toContain('ana@example.com');
  });
});

describe('session decoding', () => {
  it('treats a forged or corrupt cookie as no session at all', async () => {
    sessionCookie = 'not-valid-base64url-json';
    const response = await post(validBody());
    expect(response.status).toBe(401);
  });

  it('does not accept a session for a user that does not exist', async () => {
    sessionCookie = encodeSession({
      userId: 'usr_ghost' as UserId,
      handle: 'ghost@wallet.com',
      issuedAt: new Date().toISOString(),
    });

    const response = await post(validBody());
    expect(response.status).toBe(404);
  });
});
