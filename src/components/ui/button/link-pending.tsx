'use client';

import { useLinkStatus } from 'next/link';

import { Spinner } from '@/components/ui/spinner';

export function LinkPending() {
  const { pending } = useLinkStatus();

  if (!pending) return null;
  return <Spinner />;
}
