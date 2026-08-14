'use client';

import type { Contact } from '@/domain/models';
import { cx } from '@/lib/cx';
import { initials } from '@/lib/initials';
import { copy } from '@/messages/es';

import styles from './style.module.css';

export function ContactPicker({
  contacts,
  selectedId,
  onSelect,
  disabled = false,
}: {
  readonly contacts: readonly Contact[];
  readonly selectedId: string | null;
  readonly onSelect: (contact: Contact) => void;
  readonly disabled?: boolean;
}) {
  return (
    <ul className={styles['contactList']} data-testid="contact-list">
      {contacts.map((contact) => {
        const selected = contact.id === selectedId;
        return (
          <li key={contact.id}>
            <button
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              className={cx(styles['contactButton'], selected && styles['contactSelected'])}
              onClick={() => {
                onSelect(contact);
              }}
            >
              <span className={styles['contactAvatar']} aria-hidden="true">
                {initials(contact.name)}
              </span>
              <span className={styles['contactBody']}>
                <span className={styles['contactName']}>{contact.name}</span>
                <span className={styles['contactHandle']}>{contact.handle}</span>
              </span>
              {contact.isFavorite ? (
                <span className={styles['star']} aria-label={copy.transfer.favoriteLabel}>
                  ★
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
