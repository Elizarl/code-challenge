import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ReceiptScreen } from '@/components/screens/receipt-screen';
import type { TransactionId } from '@/domain/models';
import { copy } from '@/messages/es';
import { requireSessionOrRedirect } from '@/server/guards';
import { findReceipt } from '@/server/store';

export const metadata: Metadata = {
  title: copy.titles.receipt,
};

export default async function ReceiptPage(props: PageProps<'/receipt/[id]'>) {
  await requireSessionOrRedirect();

  const { id } = await props.params;
  const receipt = findReceipt(id as TransactionId);
  if (receipt === null) notFound();

  return <ReceiptScreen receipt={receipt} />;
}
