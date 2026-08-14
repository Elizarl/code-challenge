'use client';

import { Button } from '@/components/ui/button';
import { Card, SectionTitle, Stack } from '@/components/ui/layout';
import { EmptyState } from '@/components/ui/state-view';
import { TextField } from '@/components/ui/text-field';
import { formatMoney, sanitizeAmountInput } from '@/domain/money';
import { cx } from '@/lib/cx';
import { copy } from '@/messages/es';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectAvailableBalance,
  selectCanContinue,
  selectContacts,
  selectFieldErrors,
  selectTransfer,
} from '@/store/selectors';
import {
  amountChanged,
  contactSelected,
  fieldTouched,
  manualChanged,
  modeChanged,
  noteChanged,
  reviewRequested,
  saveRecipientToggled,
} from '@/store/transfer-slice';

import { ContactPicker } from '../contact-picker';
import styles from './style.module.css';

export function ComposeStep() {
  const dispatch = useAppDispatch();
  const transfer = useAppSelector(selectTransfer);
  const contacts = useAppSelector(selectContacts);
  const availableBalance = useAppSelector(selectAvailableBalance);
  const canContinue = useAppSelector(selectCanContinue);
  const errors = useAppSelector(selectFieldErrors);

  return (
    <Stack>
      <Card>
        <Stack>
          <div>
            <label className={styles['amountLabel']} htmlFor="amount-input">
              {copy.transfer.amountLabel}
            </label>
            <div className={styles['amountWrapper']}>
              <span className={styles['amountPrefix']} aria-hidden="true">
                $
              </span>
              <input
                id="amount-input"
                className={cx(
                  styles['amountInput'],
                  errors.amount !== null && styles['amountInvalid'],
                )}
                inputMode="decimal"
                autoComplete="off"
                placeholder={copy.transfer.amountPlaceholder}
                aria-invalid={errors.amount !== null}
                aria-describedby={errors.amount !== null ? 'amount-error' : undefined}
                value={transfer.amountInput}
                onChange={(event) =>
                  dispatch(amountChanged(sanitizeAmountInput(event.target.value)))
                }
                onBlur={() => dispatch(fieldTouched('amount'))}
              />
            </div>

            <div className={styles['availableRow']}>
              <span>{copy.transfer.available(formatMoney(availableBalance))}</span>
            </div>

            {errors.amount !== null ? (
              <p id="amount-error" role="alert" className={styles['fieldError']}>
                {errors.amount}
              </p>
            ) : null}
          </div>
        </Stack>
      </Card>

      <Card>
        <Stack>
          <SectionTitle>{copy.transfer.recipientTitle}</SectionTitle>

          <div
            className={styles['tabs']}
            role="tablist"
            aria-label={copy.transfer.recipientTabsLabel}
          >
            <button
              type="button"
              role="tab"
              aria-selected={transfer.mode === 'contact'}
              className={cx(styles['tab'], transfer.mode === 'contact' && styles['tabActive'])}
              onClick={() => dispatch(modeChanged('contact'))}
            >
              {copy.transfer.tabFavorites}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={transfer.mode === 'manual'}
              className={cx(styles['tab'], transfer.mode === 'manual' && styles['tabActive'])}
              onClick={() => dispatch(modeChanged('manual'))}
            >
              {copy.transfer.tabManual}
            </button>
          </div>

          {transfer.mode === 'contact' ? (
            contacts.length === 0 ? (
              <EmptyState
                title={copy.transfer.noContactsTitle}
                description={copy.transfer.noContactsDescription}
              />
            ) : (
              <ContactPicker
                contacts={contacts}
                selectedId={transfer.selectedContactId}
                onSelect={(contact) => dispatch(contactSelected(contact.id))}
              />
            )
          ) : (
            <Stack>
              <TextField
                label={copy.transfer.nameLabel}
                autoComplete="name"
                placeholder={copy.transfer.namePlaceholder}
                value={transfer.manual.name}
                onChange={(event) => dispatch(manualChanged({ name: event.target.value }))}
                onBlur={() => dispatch(fieldTouched('recipient'))}
              />

              <TextField
                label={copy.transfer.handleLabel}
                placeholder={copy.transfer.handlePlaceholder}
                value={transfer.manual.handle}
                error={errors.recipient}
                onChange={(event) => dispatch(manualChanged({ handle: event.target.value }))}
                onBlur={() => dispatch(fieldTouched('recipient'))}
              />

              <label className={styles['checkbox']}>
                <input
                  type="checkbox"
                  checked={transfer.saveRecipient}
                  onChange={(event) => dispatch(saveRecipientToggled(event.target.checked))}
                />
                <span>{copy.transfer.saveContact}</span>
              </label>
            </Stack>
          )}

          {transfer.mode === 'contact' && errors.recipient !== null ? (
            <p role="alert" className={styles['fieldError']}>
              {errors.recipient}
            </p>
          ) : null}
        </Stack>
      </Card>

      <Card>
        <TextField
          label={copy.transfer.noteLabel}
          placeholder={copy.transfer.notePlaceholder}
          maxLength={140}
          value={transfer.note}
          onChange={(event) => dispatch(noteChanged(event.target.value))}
        />
      </Card>

      <Button
        block
        data-testid="continue"
        disabled={!canContinue}
        onClick={() => {
          if (canContinue) dispatch(reviewRequested());
        }}
      >
        {copy.transfer.continue}
      </Button>
    </Stack>
  );
}
