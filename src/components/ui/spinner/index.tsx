import { cx } from '@/lib/cx';

import styles from './style.module.css';

export function Spinner({ large = false }: { readonly large?: boolean }) {
  return <span className={cx(styles['spinner'], large && styles['large'])} aria-hidden="true" />;
}
