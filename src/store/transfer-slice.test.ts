import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiFailure } from '@/api/client';
import type { Contact, ContactId } from '@/domain/models';
import { cents } from '@/domain/money';

import {
  amountChanged,
  backToCompose,
  contactSelected,
  contextHydrated,
  draftReset,
  fieldTouched,
  initialTransferState,
  manualChanged,
  modeChanged,
  noteChanged,
  resolveRecipient,
  reviewRequested,
  submitFailed,
  submitStarted,
  transferReducer,
  type TransferState,
} from './transfer-slice';

let uuidCounter = 0;

beforeEach(() => {
  uuidCounter = 0;
  vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => `uuid-${++uuidCounter}`);
});

const CONTACTS: Contact[] = [
  { id: 'con_1' as ContactId, name: 'Lucía', handle: 'lucia@example.com', isFavorite: true },
  { id: 'con_2' as ContactId, name: 'Martín', handle: '+15555550111', isFavorite: true },
];

function state(overrides: Partial<TransferState> = {}): TransferState {
  return { ...initialTransferState('key-0'), ...overrides };
}

const FAILURE: ApiFailure = {
  code: 'TIMEOUT',
  message: 'timeout',
  retryable: true,
  violations: [],
};

describe('transfer slice', () => {
  it('starts on the compose step with an empty draft', () => {
    const initial = initialTransferState('key-0');
    expect(initial.step).toBe('compose');
    expect(initial.amountInput).toBe('');
    expect(initial.submitAttempted).toBe(false);
  });

  describe('idempotency key lifecycle', () => {
    it('regenerates the key when the amount changes', () => {
      const next = transferReducer(state(), amountChanged('50'));
      expect(next.idempotencyKey).not.toBe('key-0');
    });

    it('regenerates the key when the recipient changes', () => {
      const next = transferReducer(state(), contactSelected('con_1' as ContactId));
      expect(next.idempotencyKey).not.toBe('key-0');
    });

    it('keeps the key when only the note changes', () => {
      const next = transferReducer(state(), noteChanged('Cena'));
      expect(next.idempotencyKey).toBe('key-0');
    });

    it('keeps the key across submit and failure so a retry replays', () => {
      const submitting = transferReducer(state({ step: 'review' }), submitStarted());
      const failed = transferReducer(submitting, submitFailed(FAILURE));
      const retried = transferReducer(failed, submitStarted());

      expect(failed.idempotencyKey).toBe('key-0');
      expect(retried.idempotencyKey).toBe('key-0');
    });
  });

  describe('failure handling', () => {
    it('records the failure and moves to the failed step', () => {
      const next = transferReducer(state({ step: 'submitting' }), submitFailed(FAILURE));
      expect(next.step).toBe('failed');
      expect(next.failure).toMatchObject({ code: 'TIMEOUT', retryable: true });
    });

    it('clears a previous failure when the draft is edited', () => {
      const failed = transferReducer(state({ step: 'submitting' }), submitFailed(FAILURE));
      expect(transferReducer(failed, amountChanged('12')).failure).toBeNull();
    });

    it('clears the failure when going back to edit', () => {
      const failed = transferReducer(state({ step: 'submitting' }), submitFailed(FAILURE));
      expect(transferReducer(failed, backToCompose())).toMatchObject({
        step: 'compose',
        failure: null,
      });
    });
  });

  describe('recipient modes', () => {
    it('clears the manual entry when switching to contacts', () => {
      const manual = state({ mode: 'manual', manual: { name: 'Ana', handle: 'a@b.com' } });
      expect(transferReducer(manual, modeChanged('contact')).manual).toEqual({
        name: '',
        handle: '',
      });
    });

    it('clears the selected contact when switching to manual', () => {
      const picked = state({ selectedContactId: 'con_1' as ContactId });
      expect(transferReducer(picked, modeChanged('manual')).selectedContactId).toBeNull();
    });

    it('marks the recipient as touched when a contact is picked', () => {
      expect(
        transferReducer(state(), contactSelected('con_1' as ContactId)).touched.recipient,
      ).toBe(true);
    });
  });

  it('records that a submit was attempted when moving to review', () => {
    expect(transferReducer(state(), reviewRequested())).toMatchObject({
      step: 'review',
      submitAttempted: true,
    });
  });

  it('marks a field as touched', () => {
    expect(transferReducer(state(), fieldTouched('amount')).touched.amount).toBe(true);
  });

  describe('context hydration', () => {
    it('stores the server-provided context', () => {
      const next = transferReducer(
        state(),
        contextHydrated({
          contacts: CONTACTS,
          availableBalance: cents(1_000_00),
          ownHandles: ['demo@wallet.com'],
        }),
      );

      expect(next.context.contacts).toHaveLength(2);
      expect(next.context.availableBalance).toBe(100_000);
    });

    it('survives a draft reset so the flow stays usable', () => {
      const hydrated = transferReducer(
        state({ amountInput: '99' }),
        contextHydrated({
          contacts: CONTACTS,
          availableBalance: cents(1_000_00),
          ownHandles: [],
        }),
      );
      const reset = transferReducer(hydrated, draftReset());

      expect(reset.amountInput).toBe('');
      expect(reset.context.contacts).toHaveLength(2);
    });
  });
});

describe('resolveRecipient', () => {
  function hydrated(overrides: Partial<TransferState> = {}): TransferState {
    const base = transferReducer(
      state(overrides),
      contextHydrated({ contacts: CONTACTS, availableBalance: cents(1_000_00), ownHandles: [] }),
    );
    return { ...base, ...overrides };
  }

  it('resolves the selected contact', () => {
    expect(resolveRecipient(hydrated({ selectedContactId: 'con_2' as ContactId }))).toEqual({
      contactId: 'con_2',
      name: 'Martín',
      handle: '+15555550111',
    });
  });

  it('returns null when nothing is selected', () => {
    expect(resolveRecipient(hydrated())).toBeNull();
  });

  it('returns null when the selected contact no longer exists', () => {
    expect(resolveRecipient(hydrated({ selectedContactId: 'con_gone' as ContactId }))).toBeNull();
  });

  it('builds a recipient from manual input', () => {
    const manual = transferReducer(hydrated(), manualChanged({ name: 'Ana', handle: 'a@b.com' }));
    expect(resolveRecipient(manual)).toEqual({
      contactId: null,
      name: 'Ana',
      handle: 'a@b.com',
    });
  });

  it('returns null for a completely empty manual entry', () => {
    expect(resolveRecipient(hydrated({ mode: 'manual' }))).toBeNull();
  });
});
