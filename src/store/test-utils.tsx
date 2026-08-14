import { render, type RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';

import type { Contact } from '@/domain/models';
import type { Cents } from '@/domain/money';

import { type AppStore, makeStore } from './index';
import { contextHydrated } from './transfer-slice';

export interface TransferSetup {
  contacts?: Contact[];
  availableBalance: Cents;
  ownHandles?: string[];
}

export function renderWithStore(
  ui: ReactNode,
  options: { store?: AppStore; transfer?: TransferSetup } = {},
): RenderResult & { store: AppStore } {
  const store = options.store ?? makeStore();

  if (options.transfer) {
    store.dispatch(
      contextHydrated({
        contacts: options.transfer.contacts ?? [],
        availableBalance: options.transfer.availableBalance,
        ownHandles: options.transfer.ownHandles ?? [],
      }),
    );
  }

  return { ...render(<Provider store={store}>{ui}</Provider>), store };
}
