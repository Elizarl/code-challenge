import type { ReactNode } from 'react';

import { MAIN_CONTENT_ID } from '@/components/ui/skip-link';
import { cx } from '@/lib/cx';

import styles from './style.module.css';

export function Main({ children }: { readonly children: ReactNode }) {
  return (
    <main id={MAIN_CONTENT_ID} tabIndex={-1}>
      {children}
    </main>
  );
}

export function PageShell({ children }: { readonly children: ReactNode }) {
  return <div className={styles['page']}>{children}</div>;
}

export function Card({
  children,
  flush = false,
  ...rest
}: {
  readonly children: ReactNode;
  readonly flush?: boolean;
  readonly 'aria-labelledby'?: string;
}) {
  return (
    <section {...rest} className={cx(styles['card'], flush && styles['flush'])}>
      {children}
    </section>
  );
}

export function Stack({
  children,
  tight = false,
}: {
  readonly children: ReactNode;
  readonly tight?: boolean;
}) {
  return <div className={cx(styles['stack'], tight && styles['tight'])}>{children}</div>;
}

export function Row({ children }: { readonly children: ReactNode }) {
  return <div className={styles['row']}>{children}</div>;
}

export function SectionTitle({
  children,
  id,
}: {
  readonly children: ReactNode;
  readonly id?: string;
}) {
  return (
    <h2 className={styles['sectionTitle']} id={id}>
      {children}
    </h2>
  );
}

export function PageTitle({ children }: { readonly children: ReactNode }) {
  return <h1 className={styles['pageTitle']}>{children}</h1>;
}
