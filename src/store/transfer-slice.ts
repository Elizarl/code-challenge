import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { ApiFailure } from '@/api/client';
import type { Contact, ContactId, TransferRecipient } from '@/domain/models';
import { type Cents, ZERO } from '@/domain/money';
import type { TransferFailureCode } from '@/domain/transfer/failures';
import type { TransferViolation } from '@/domain/transfer/violations';

export interface StoredFailure {
  code: TransferFailureCode;
  message: string;
  retryable: boolean;
  violations: TransferViolation[];
}

export function storeFailure(failure: ApiFailure): StoredFailure {
  return { ...failure, violations: [...failure.violations] };
}

export type TransferStep = 'compose' | 'review' | 'submitting' | 'failed';

export type RecipientMode = 'contact' | 'manual';

export interface ManualRecipientInput {
  name: string;
  handle: string;
}

export interface TransferContext {
  contacts: Contact[];
  availableBalance: Cents;
  ownHandles: string[];
}

export interface TransferState {
  step: TransferStep;
  amountInput: string;
  note: string;
  mode: RecipientMode;
  selectedContactId: ContactId | null;
  manual: ManualRecipientInput;
  saveRecipient: boolean;
  touched: { amount: boolean; recipient: boolean };
  submitAttempted: boolean;
  failure: StoredFailure | null;
  idempotencyKey: string;
  context: TransferContext;
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

function emptyDraft(idempotencyKey: string) {
  return {
    step: 'compose' as TransferStep,
    amountInput: '',
    note: '',
    mode: 'contact' as RecipientMode,
    selectedContactId: null,
    manual: { name: '', handle: '' },
    saveRecipient: true,
    touched: { amount: false, recipient: false },
    submitAttempted: false,
    failure: null,
    idempotencyKey,
  };
}

export function initialTransferState(idempotencyKey = newIdempotencyKey()): TransferState {
  return {
    ...emptyDraft(idempotencyKey),
    context: { contacts: [], availableBalance: ZERO, ownHandles: [] },
  };
}

function invalidateAttempt(state: TransferState): void {
  state.failure = null;
  state.idempotencyKey = newIdempotencyKey();
}

const transferSlice = createSlice({
  name: 'transfer',
  initialState: initialTransferState,
  reducers: {
    contextHydrated(state, action: PayloadAction<TransferContext>) {
      state.context = action.payload;
    },
    amountChanged(state, action: PayloadAction<string>) {
      state.amountInput = action.payload;
      invalidateAttempt(state);
    },
    noteChanged(state, action: PayloadAction<string>) {
      state.note = action.payload;
    },
    modeChanged(state, action: PayloadAction<RecipientMode>) {
      state.mode = action.payload;
      if (action.payload === 'manual') state.selectedContactId = null;
      else state.manual = { name: '', handle: '' };
      invalidateAttempt(state);
    },
    contactSelected(state, action: PayloadAction<ContactId>) {
      state.mode = 'contact';
      state.selectedContactId = action.payload;
      state.touched.recipient = true;
      invalidateAttempt(state);
    },
    manualChanged(state, action: PayloadAction<Partial<ManualRecipientInput>>) {
      state.mode = 'manual';
      state.manual = { ...state.manual, ...action.payload };
      invalidateAttempt(state);
    },
    saveRecipientToggled(state, action: PayloadAction<boolean>) {
      state.saveRecipient = action.payload;
    },
    fieldTouched(state, action: PayloadAction<'amount' | 'recipient'>) {
      state.touched[action.payload] = true;
    },
    reviewRequested(state) {
      state.step = 'review';
      state.submitAttempted = true;
    },
    backToCompose(state) {
      state.step = 'compose';
      state.failure = null;
    },
    submitStarted(state) {
      state.step = 'submitting';
      state.failure = null;
    },
    submitFailed(state, action: PayloadAction<ApiFailure>) {
      state.step = 'failed';
      state.failure = storeFailure(action.payload);
    },
    draftReset(state) {
      return { ...emptyDraft(newIdempotencyKey()), context: state.context };
    },
  },
});

export const {
  contextHydrated,
  amountChanged,
  noteChanged,
  modeChanged,
  contactSelected,
  manualChanged,
  saveRecipientToggled,
  fieldTouched,
  reviewRequested,
  backToCompose,
  submitStarted,
  submitFailed,
  draftReset,
} = transferSlice.actions;

export const transferReducer = transferSlice.reducer;

export function resolveRecipient(state: TransferState): TransferRecipient | null {
  if (state.mode === 'manual') {
    const { name, handle } = state.manual;
    if (name.trim() === '' && handle.trim() === '') return null;
    return { contactId: null, name, handle };
  }

  if (state.selectedContactId === null) return null;
  const contact = state.context.contacts.find(
    (candidate) => candidate.id === state.selectedContactId,
  );
  if (contact === undefined) return null;

  return { contactId: contact.id, name: contact.name, handle: contact.handle };
}
