import { ButtonLink } from '@/components/ui/button';
import { Card, Main, PageShell } from '@/components/ui/layout';
import { EmptyState } from '@/components/ui/state-view';
import { copy } from '@/messages/es';

export function NotFoundScreen() {
  return (
    <Main>
      <PageShell>
        <Card>
          <EmptyState
            asHeading
            title={copy.errors.notFoundTitle}
            description={copy.errors.notFoundDescription}
          />
        </Card>
        <ButtonLink href="/home" block prefetch={false}>
          {copy.app.backToHome}
        </ButtonLink>
      </PageShell>
    </Main>
  );
}
