import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { copy } from '@/messages/es';

import styles from './style.module.css';

function Title({
  asHeading,
  children,
}: {
  readonly asHeading: boolean;
  readonly children: ReactNode;
}) {
  if (asHeading) return <h1 className={styles['title']}>{children}</h1>;
  return <p className={styles['title']}>{children}</p>;
}

export function LoadingState({ label }: { readonly label: string }) {
  return (
    <div className={styles['box']} role="status" aria-live="polite">
      <Spinner large />
      <p className={styles['muted']}>{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  asHeading = false,
}: {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly asHeading?: boolean;
}) {
  return (
    <div className={styles['box']}>
      <Title asHeading={asHeading}>{title}</Title>
      {description !== undefined ? <p className={styles['muted']}>{description}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = copy.app.retry,
  retrying = false,
  asHeading = false,
}: {
  readonly title: string;
  readonly description: string;
  readonly onRetry?: () => void;
  readonly retryLabel?: string;
  readonly retrying?: boolean;
  readonly asHeading?: boolean;
}) {
  return (
    <div className={styles['box']} role="alert">
      <Title asHeading={asHeading}>{title}</Title>
      <p className={styles['muted']}>{description}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry} loading={retrying}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
