'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Provider } from 'react-redux';

import { makeStore } from '@/store';

export function Providers({ children }: { readonly children: ReactNode }) {
  const [store] = useState(makeStore);

  return <Provider store={store}>{children}</Provider>;
}
