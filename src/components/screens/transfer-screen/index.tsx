import { TransferFlow } from '@/components/transfer/transfer-flow';
import { ButtonLink } from '@/components/ui/button';
import { Main, PageShell, PageTitle } from '@/components/ui/layout';
import type { Contact } from '@/domain/models';
import type { Cents } from '@/domain/money';
import { copy } from '@/messages/es';

export function TransferScreen({
  contacts,
  availableBalance,
  ownHandles,
}: {
  readonly contacts: readonly Contact[];
  readonly availableBalance: Cents;
  readonly ownHandles: readonly string[];
}) {
  return (
    <Main>
      <PageShell>
        <div>
          <ButtonLink href="/home" variant="ghost" prefetch={false}>
            ← {copy.app.back}
          </ButtonLink>
        </div>

        <PageTitle>{copy.transfer.pageTitle}</PageTitle>

        <TransferFlow
          contacts={contacts}
          availableBalance={availableBalance}
          ownHandles={ownHandles}
        />
      </PageShell>
    </Main>
  );
}
