import { configureStore } from '@reduxjs/toolkit';

import { transferReducer } from './transfer-slice';
import { walletReducer } from './wallet-slice';

export function makeStore() {
  return configureStore({
    reducer: {
      transfer: transferReducer,
      wallet: walletReducer,
    },
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
