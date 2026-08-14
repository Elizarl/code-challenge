'use client';

import { useEffect } from 'react';

import { ButtonLink } from '@/components/ui/button';
import { Card, Main, PageShell } from '@/components/ui/layout';
import { ErrorState } from '@/components/ui/state-view';
import { copy } from '@/messages/es';

export function ErrorScreen({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled route error', error);
  }, [error]);

  return (
    <Main>
      <PageShell>
        <Card>
          <ErrorState
            asHeading
            title={copy.errors.genericTitle}
            description={copy.errors.genericDescription}
            onRetry={reset}
          />
        </Card>
        <ButtonLink href="/home" variant="secondary" block prefetch={false}>
          {copy.app.backToHome}
        </ButtonLink>
      </PageShell>
    </Main>
  );
}
