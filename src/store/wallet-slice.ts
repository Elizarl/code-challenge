import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { type ApiFailure, fetchWallet } from '@/api/client';
import type { Account, Movement, User, WalletSnapshot } from '@/domain/models';

import { type StoredFailure, storeFailure } from './transfer-slice';

export interface StoredWallet {
  user: User;
  account: Account;
  movements: Movement[];
}

export type WalletStatus = 'idle' | 'loading' | 'reloading' | 'success' | 'error';

export interface WalletState {
  status: WalletStatus;
  snapshot: StoredWallet | null;
  failure: StoredFailure | null;
}

const initialState: WalletState = {
  status: 'idle',
  snapshot: null,
  failure: null,
};

export const loadWallet = createAsyncThunk<
  WalletSnapshot,
  { isReload?: boolean } | undefined,
  { rejectValue: ApiFailure }
>('wallet/load', async (_arg, { signal, rejectWithValue }) => {
  const result = await fetchWallet({ signal });
  if (!result.ok) return rejectWithValue(result.failure);
  return result.data;
});

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    accountUpdated(state, action: PayloadAction<Account>) {
      if (state.snapshot !== null) state.snapshot = { ...state.snapshot, account: action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadWallet.pending, (state, action) => {
        state.status = action.meta.arg?.isReload === true ? 'reloading' : 'loading';
        state.failure = null;
      })
      .addCase(loadWallet.fulfilled, (state, action) => {
        state.status = 'success';
        state.snapshot = { ...action.payload, movements: [...action.payload.movements] };
        state.failure = null;
      })
      .addCase(loadWallet.rejected, (state, action) => {
        if (action.meta.aborted) return;
        state.status = 'error';
        state.failure =
          action.payload === undefined
            ? {
                code: 'UNKNOWN_ERROR',
                message: 'Ocurrió un error inesperado.',
                retryable: true,
                violations: [],
              }
            : storeFailure(action.payload);
      });
  },
});

export const { accountUpdated } = walletSlice.actions;
export const walletReducer = walletSlice.reducer;
