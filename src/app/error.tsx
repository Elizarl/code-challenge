'use client';

import { ErrorScreen } from '@/components/screens/error-screen';

export default function RouteError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  return <ErrorScreen error={error} reset={reset} />;
}
