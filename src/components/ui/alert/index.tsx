import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';

import styles from './style.module.css';

export function Alert({
  tone,
  title,
  children,
}: {
  readonly tone: 'danger' | 'success';
  readonly title: string;
  readonly children?: ReactNode;
}) {
  return (
    <div
      className={cx(styles['alert'], tone === 'danger' ? styles['danger'] : styles['success'])}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <p className={styles['title']}>{title}</p>
      {children !== undefined ? <div className={styles['body']}>{children}</div> : null}
    </div>
  );
}
