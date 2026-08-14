import type { Movement } from '@/domain/models';
import { formatSignedMoney } from '@/domain/money';
import { cx } from '@/lib/cx';
import { initials } from '@/lib/initials';
import { copy } from '@/messages/es';

import styles from './style.module.css';

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(new Date(iso));
}

export function MovementItem({ movement }: { readonly movement: Movement }) {
  const isCredit = movement.direction === 'credit';

  return (
    <li className={styles['item']}>
      <span className={cx(styles['avatar'], isCredit && styles['avatarCredit'])} aria-hidden="true">
        {initials(movement.counterparty)}
      </span>

      <span className={styles['body']}>
        <span className={styles['name']}>{movement.counterparty}</span>
        <span className={styles['meta']}>
          {movement.description} · {formatDate(movement.createdAt)}
          {movement.status === 'pending' ? (
            <span className={styles['pending']}>{copy.home.pendingBadge}</span>
          ) : null}
        </span>
      </span>

      <span className={cx(styles['amount'], isCredit && styles['credit'])}>
        {formatSignedMoney(movement.amount, movement.direction)}
      </span>
    </li>
  );
}

export function MovementList({ movements }: { readonly movements: readonly Movement[] }) {
  return (
    <ul className={styles['list']} data-testid="movement-list">
      {movements.map((movement) => (
        <MovementItem key={movement.id} movement={movement} />
      ))}
    </ul>
  );
}
