import { Main, PageShell } from '@/components/ui/layout';
import { AppHeader } from '@/components/wallet/app-header';
import { WalletPanel } from '@/components/wallet/wallet-panel';

export function HomeScreen({ displayName }: { readonly displayName: string }) {
  return (
    <Main>
      <PageShell>
        <AppHeader name={displayName} />
        <WalletPanel />
      </PageShell>
    </Main>
  );
}
