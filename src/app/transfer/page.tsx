import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { TransferScreen } from '@/components/screens/transfer-screen';
import { copy } from '@/messages/es';
import { requireSessionOrRedirect } from '@/server/guards';
import { findUser, getAccount, listContacts } from '@/server/store';

export const metadata: Metadata = {
  title: copy.titles.transfer,
};

export default async function TransferPage() {
  const session = await requireSessionOrRedirect('/transfer');

  const account = getAccount(session.userId);
  const user = findUser(session.userId);
  if (account === null || user === null) notFound();

  return (
    <TransferScreen
      contacts={listContacts(session.userId)}
      availableBalance={account.balance}
      ownHandles={[user.email, user.phone, session.handle]}
    />
  );
}
