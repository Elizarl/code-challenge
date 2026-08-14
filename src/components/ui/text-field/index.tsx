import type { InputHTMLAttributes } from 'react';
import { useId } from 'react';

import { cx } from '@/lib/cx';

import styles from './style.module.css';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'id'> {
  readonly label: string;
  readonly hint?: string;
  readonly error?: string | null;
}

export function TextField({ label, hint, error, ...rest }: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const invalid = typeof error === 'string' && error !== '';

  const describedBy = cx(hint !== undefined && hintId, invalid && errorId);

  return (
    <div className={styles['field']}>
      <label className={styles['label']} htmlFor={id}>
        {label}
      </label>

      <input
        {...rest}
        id={id}
        className={cx(styles['input'], invalid && styles['invalid'])}
        aria-invalid={invalid}
        aria-describedby={describedBy === '' ? undefined : describedBy}
      />

      {hint !== undefined ? (
        <p id={hintId} className={styles['hint']}>
          {hint}
        </p>
      ) : null}

      {invalid ? (
        <p id={errorId} className={styles['error']} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
