'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { createTransfer } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Stack } from '@/components/ui/layout';
import { LoadingState } from '@/components/ui/state-view';
import type { Contact } from '@/domain/models';
import type { Cents } from '@/domain/money';
import { cx } from '@/lib/cx';
import { copy } from '@/messages/es';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectTransfer, selectTransferStep, selectValidation } from '@/store/selectors';
import {
  backToCompose,
  contextHydrated,
  draftReset,
  submitFailed,
  submitStarted,
} from '@/store/transfer-slice';

import { ComposeStep } from '../compose-step';
import styles from './style.module.css';

const ReviewStep = dynamic(() => import('../review-step').then((m) => m.ReviewStep), {
  loading: () => <LoadingState label={copy.transfer.preparingSummary} />,
});

const REVIEW_QUERY = '?step=review';

export function TransferFlow({
  contacts,
  availableBalance,
  ownHandles,
}: {
  readonly contacts: readonly Contact[];
  readonly availableBalance: Cents;
  readonly ownHandles: readonly string[];
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const transfer = useAppSelector(selectTransfer);
  const step = useAppSelector(selectTransferStep);
  const validation = useAppSelector(selectValidation);

  const onReview = step !== 'compose';
  const pushedReviewEntry = useRef(false);

  useEffect(() => {
    dispatch(draftReset());
    dispatch(
      contextHydrated({
        contacts: [...contacts],
        availableBalance,
        ownHandles: [...ownHandles],
      }),
    );
    if (window.location.search !== '') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [dispatch, contacts, availableBalance, ownHandles]);

  useEffect(() => {
    if (onReview && !pushedReviewEntry.current) {
      pushedReviewEntry.current = true;
      window.history.pushState(null, '', REVIEW_QUERY);
    } else if (!onReview) {
      pushedReviewEntry.current = false;
    }
  }, [onReview]);

  useEffect(() => {
    function returnToCompose() {
      pushedReviewEntry.current = false;
      dispatch(backToCompose());
    }

    window.addEventListener('popstate', returnToCompose);
    return () => {
      window.removeEventListener('popstate', returnToCompose);
    };
  }, [dispatch]);

  async function confirm() {
    if (!validation.ok) {
      window.history.back();
      return;
    }

    dispatch(submitStarted());

    const result = await createTransfer(
      {
        amountInput: transfer.amountInput,
        recipient: {
          contactId: validation.command.recipient.contactId,
          name: validation.command.recipient.name,
          handle: validation.command.recipient.handle,
        },
        note: transfer.note,
        saveRecipient: transfer.mode === 'manual' && transfer.saveRecipient,
      },
      { idempotencyKey: transfer.idempotencyKey },
    );

    if (!result.ok) {
      dispatch(submitFailed(result.failure));
      return;
    }

    router.replace(`/receipt/${result.data.receipt.transactionId}`);
    router.refresh();
  }

  return (
    <Stack>
      <StepIndicator step={onReview ? 2 : 1} />

      {onReview && validation.ok ? (
        <ReviewStep
          command={validation.command}
          onConfirm={() => void confirm()}
          onBack={() => {
            window.history.back();
          }}
        />
      ) : (
        <ComposeStep />
      )}

      {onReview && !validation.ok ? (
        <Button
          variant="secondary"
          block
          onClick={() => {
            window.history.back();
          }}
        >
          {copy.transfer.backToEdit}
        </Button>
      ) : null}
    </Stack>
  );
}

function StepIndicator({ step }: { readonly step: 1 | 2 }) {
  return (
    <div className={styles['steps']} aria-label={copy.transfer.stepIndicator(step, 2)}>
      <span className={cx(styles['dot'], styles['dotActive'])}>1</span>
      <span className={styles['label']}>{copy.transfer.stepData}</span>
      <span className={styles['bar']} />
      <span className={cx(styles['dot'], step === 2 && styles['dotActive'])}>2</span>
      <span className={styles['label']}>{copy.transfer.stepConfirm}</span>
    </div>
  );
}
