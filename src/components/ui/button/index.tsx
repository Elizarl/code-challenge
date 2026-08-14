import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Spinner } from '@/components/ui/spinner';
import { cx } from '@/lib/cx';

import { LinkPending } from './link-pending';
import styles from './style.module.css';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  readonly variant?: Variant;
  readonly block?: boolean;
  readonly loading?: boolean;
  readonly children: ReactNode;
}

const VARIANT_CLASS: Record<Variant, string | undefined> = {
  primary: styles['primary'],
  secondary: styles['secondary'],
  ghost: styles['ghost'],
};

export function Button({
  variant = 'primary',
  block = false,
  loading = false,
  disabled,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={cx(styles['button'], VARIANT_CLASS[variant], block && styles['block'])}
      disabled={disabled === true || loading}
      aria-busy={loading}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = 'primary',
  block = false,
  prefetch = true,
  children,
}: {
  readonly href: string;
  readonly variant?: Variant;
  readonly block?: boolean;
  readonly prefetch?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={cx(
        styles['button'],
        VARIANT_CLASS[variant],
        block && styles['block'],
        styles['link'],
      )}
    >
      {children}
      <LinkPending />
    </Link>
  );
}
