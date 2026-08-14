'use client';

import { useEffect } from 'react';

import { ButtonLink } from '@/components/ui/button';
import { Card, SectionTitle, Stack } from '@/components/ui/layout';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state-view';
import { BalanceCard } from '@/components/wallet/balance-card';
import { MovementList } from '@/components/wallet/movement-list';
import { failureCopy } from '@/messages/es';
import { copy } from '@/messages/es';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectIsReloading,
  selectWalletFailure,
  selectWalletSnapshot,
  selectWalletStatus,
} from '@/store/selectors';
import { loadWallet } from '@/store/wallet-slice';

import styles from './style.module.css';

export function WalletPanel() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectWalletStatus);
  const snapshot = useAppSelector(selectWalletSnapshot);
  const failure = useAppSelector(selectWalletFailure);
  const isReloading = useAppSelector(selectIsReloading);

  useEffect(() => {
    const promise = dispatch(loadWallet());
    return () => {
      promise.abort();
    };
  }, [dispatch]);

  const retry = () => {
    void dispatch(loadWallet({ isReload: true }));
  };

  const showSkeleton = status === 'idle' || status === 'loading';

  const announcement = showSkeleton
    ? copy.home.announceLoading
    : status === 'error'
      ? copy.home.announceError
      : snapshot !== null
        ? copy.home.announceReady(snapshot.movements.length)
        : '';

  return (
    <Stack>
      <p aria-live="polite" role="status" className={styles['srOnly']}>
        {announcement}
      </p>

      {showSkeleton ? <WalletSkeleton /> : null}

      {status === 'error' && failure !== null ? (
        <Card>
          <ErrorState
            title={failureCopy(failure.code).title}
            description={failure.message}
            onRetry={retry}
            retrying={isReloading}
          />
        </Card>
      ) : null}

      {(status === 'success' || status === 'reloading') && snapshot !== null ? (
        <>
          <BalanceCard account={snapshot.account} ownerName={snapshot.user.fullName} />

          <ButtonLink href="/transfer" block>
            {copy.home.newTransfer}
          </ButtonLink>

          <Card flush aria-labelledby="movements-heading">
            <div className={styles['listHeader']}>
              <SectionTitle id="movements-heading">{copy.home.movementsTitle}</SectionTitle>
            </div>

            {snapshot.movements.length === 0 ? (
              <EmptyState title={copy.home.emptyTitle} description={copy.home.emptyDescription} />
            ) : (
              <MovementList movements={snapshot.movements} />
            )}
          </Card>
        </>
      ) : null}
    </Stack>
  );
}

function WalletSkeleton() {
  return (
    <Stack>
      <Skeleton height="7.5rem" />
      <Skeleton height="2.875rem" />
      <Card flush>
        <div className={styles['skeletonList']}>
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className={styles['skeletonRow']}>
              <Skeleton height="2.25rem" width="2.25rem" />
              <div className={styles['skeletonText']}>
                <Skeleton height="0.875rem" width="55%" />
                <Skeleton height="0.75rem" width="35%" />
              </div>
              <Skeleton height="0.875rem" width="4rem" />
            </div>
          ))}
        </div>
      </Card>
    </Stack>
  );
}
