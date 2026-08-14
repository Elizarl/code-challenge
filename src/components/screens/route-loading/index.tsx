import { Main, PageShell } from '@/components/ui/layout';
import { LoadingState } from '@/components/ui/state-view';
import { copy } from '@/messages/es';

export function RouteLoading() {
  return (
    <Main>
      <PageShell>
        <LoadingState label={copy.app.loading} />
      </PageShell>
    </Main>
  );
}
