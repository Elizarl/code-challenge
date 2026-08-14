import type { Account } from '@/domain/models';
import { formatMoney } from '@/domain/money';
import { copy } from '@/messages/es';

import styles from './style.module.css';

export function BalanceCard({
  account,
  ownerName,
}: {
  readonly account: Account;
  readonly ownerName: string;
}) {
  return (
    <div className={styles['card']}>
      <p className={styles['label']}>{copy.home.balanceLabel}</p>
      <p className={styles['amount']} data-testid="balance">
        {formatMoney(account.balance, account.currency)}
      </p>
      <p className={styles['owner']}>{ownerName}</p>
    </div>
  );
}
