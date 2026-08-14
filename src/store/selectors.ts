import { createSelector } from '@reduxjs/toolkit';

import { type TransferValidation, validateTransfer } from '@/domain/transfer/rules';
import { violationField } from '@/domain/transfer/violations';
import { violationMessage } from '@/messages/es';

import type { RootState } from './index';
import { resolveRecipient } from './transfer-slice';

export const selectTransfer = (state: RootState) => state.transfer;
export const selectTransferContext = (state: RootState) => state.transfer.context;
export const selectContacts = (state: RootState) => state.transfer.context.contacts;
export const selectAvailableBalance = (state: RootState) => state.transfer.context.availableBalance;
export const selectTransferStep = (state: RootState) => state.transfer.step;
export const selectTransferFailure = (state: RootState) => state.transfer.failure;

export const selectRecipient = createSelector([selectTransfer], resolveRecipient);

export const selectValidation = createSelector(
  [selectTransfer, selectRecipient],
  (transfer, recipient): TransferValidation =>
    validateTransfer(
      { amountInput: transfer.amountInput, recipient, note: transfer.note },
      {
        availableBalance: transfer.context.availableBalance,
        ownHandles: transfer.context.ownHandles,
      },
    ),
);

export const selectCanContinue = createSelector([selectValidation], (validation) => validation.ok);

export const selectFieldErrors = createSelector(
  [selectValidation, selectTransfer],
  (validation, transfer): { amount: string | null; recipient: string | null } => {
    if (validation.ok) return { amount: null, recipient: null };

    const messageFor = (field: 'amount' | 'recipient'): string | null => {
      if (!transfer.submitAttempted && !transfer.touched[field]) return null;
      const violation = validation.violations.find(
        (candidate) => violationField(candidate) === field,
      );
      return violation === undefined ? null : violationMessage(violation);
    };

    return { amount: messageFor('amount'), recipient: messageFor('recipient') };
  },
);

export const selectWallet = (state: RootState) => state.wallet;
export const selectWalletStatus = (state: RootState) => state.wallet.status;
export const selectWalletSnapshot = (state: RootState) => state.wallet.snapshot;
export const selectWalletFailure = (state: RootState) => state.wallet.failure;
export const selectIsReloading = (state: RootState) => state.wallet.status === 'reloading';
