import { ButtonLink } from '@/components/ui/button';
import { Card, Main, PageShell, Stack } from '@/components/ui/layout';
import { SummaryList, SummaryRow } from '@/components/ui/summary-list';
import type { Receipt } from '@/domain/models';
import { formatMoney } from '@/domain/money';
import { copy } from '@/messages/es';

import styles from './style.module.css';

export function ReceiptScreen({ receipt }: { readonly receipt: Receipt }) {
  const createdAt = new Intl.DateTimeFormat('es', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(receipt.createdAt));

  return (
    <Main>
      <PageShell>
        <div className={styles['hero']}>
          <span className={styles['check']} aria-hidden="true">
            ✓
          </span>
          <h1 className={styles['title']} data-testid="receipt-title">
            {copy.receipt.heading}
          </h1>
          <p className={styles['amount']} data-testid="receipt-amount">
            {formatMoney(receipt.amount, receipt.currency)}
          </p>
        </div>

        <Card>
          <SummaryList>
            <SummaryRow label={copy.summary.recipient}>{receipt.recipient.name}</SummaryRow>
            <SummaryRow label={copy.summary.destination}>{receipt.recipient.handle}</SummaryRow>
            {receipt.note !== null ? (
              <SummaryRow label={copy.summary.note}>{receipt.note}</SummaryRow>
            ) : null}
            <SummaryRow label={copy.summary.date}>{createdAt}</SummaryRow>
            <SummaryRow label={copy.summary.reference} mono>
              {receipt.reference}
            </SummaryRow>
            <SummaryRow label={copy.summary.balanceRemaining}>
              {formatMoney(receipt.balanceAfter, receipt.currency)}
            </SummaryRow>
          </SummaryList>
        </Card>

        <Stack tight>
          <ButtonLink href="/home" block>
            {copy.app.backToHome}
          </ButtonLink>
          <ButtonLink href="/transfer" variant="secondary" block prefetch={false}>
            {copy.receipt.newTransfer}
          </ButtonLink>
        </Stack>
      </PageShell>
    </Main>
  );
}
