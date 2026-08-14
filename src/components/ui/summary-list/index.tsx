import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';

import styles from './style.module.css';

export function SummaryList({ children }: { readonly children: ReactNode }) {
  return <ul className={styles['list']}>{children}</ul>;
}

export function SummaryRow({
  label,
  children,
  mono = false,
  testId,
}: {
  readonly label: string;
  readonly children: ReactNode;
  readonly mono?: boolean;
  readonly testId?: string;
}) {
  return (
    <li className={styles['row']}>
      <span className={styles['key']}>{label}</span>
      <span className={cx(styles['value'], mono && styles['mono'])} data-testid={testId}>
        {children}
      </span>
    </li>
  );
}
