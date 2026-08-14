'use client';

import { useEffect, useRef } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, Stack } from '@/components/ui/layout';
import { SummaryList, SummaryRow } from '@/components/ui/summary-list';
import { type Cents, formatMoney, subtractCents } from '@/domain/money';
import type { TransferCommand } from '@/domain/transfer/rules';
import { failureCopy } from '@/messages/es';
import { copy } from '@/messages/es';
import { useAppSelector } from '@/store/hooks';
import {
  selectAvailableBalance,
  selectTransferFailure,
  selectTransferStep,
} from '@/store/selectors';

import styles from './style.module.css';

export function ReviewStep({
  command,
  onConfirm,
  onBack,
}: {
  readonly command: TransferCommand;
  readonly onConfirm: () => void;
  readonly onBack: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const step = useAppSelector(selectTransferStep);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  const failure = useAppSelector(selectTransferFailure);
  const availableBalance = useAppSelector(selectAvailableBalance);

  const submitting = step === 'submitting';
  const balanceAfter: Cents = subtractCents(availableBalance, command.amount);

  return (
    <Stack>
      <h2 ref={headingRef} tabIndex={-1} className={styles['srOnly']}>
        {copy.review.srHeading}
      </h2>

      {failure !== null ? (
        <Alert tone="danger" title={failureCopy(failure.code).title}>
          <p>{failureCopy(failure.code).description}</p>
          {!failure.retryable ? (
            <p className={styles['blocked']}>{copy.review.blockedHint}</p>
          ) : null}
        </Alert>
      ) : null}

      <Card>
        <div className={styles['amount']}>
          <p className={styles['amountLabel']}>{copy.review.youWillSend}</p>
          <p className={styles['amountValue']} data-testid="summary-amount">
            {formatMoney(command.amount)}
          </p>
        </div>

        <SummaryList>
          <SummaryRow label={copy.summary.recipient} testId="summary-recipient">
            {command.recipient.name}
          </SummaryRow>
          <SummaryRow label={copy.summary.destination}>{command.recipient.handle}</SummaryRow>
          {command.note !== null ? (
            <SummaryRow label={copy.summary.note}>{command.note}</SummaryRow>
          ) : null}
          <SummaryRow label={copy.summary.balanceAfter}>{formatMoney(balanceAfter)}</SummaryRow>
        </SummaryList>
      </Card>

      <div className={styles['actions']}>
        <Button block loading={submitting} data-testid="confirm" onClick={onConfirm}>
          {submitting ? copy.review.confirming : copy.review.confirm}
        </Button>
        <Button block variant="secondary" disabled={submitting} onClick={onBack}>
          {copy.app.back}
        </Button>
      </div>
    </Stack>
  );
}
