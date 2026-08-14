'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { login } from '@/api/client';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, Stack } from '@/components/ui/layout';
import { TextField } from '@/components/ui/text-field';
import { classifyHandle } from '@/domain/handle';
import { copy } from '@/messages/es';

export function LoginForm({ next }: { readonly next: string }) {
  const router = useRouter();

  const [handle, setHandle] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isNavigating, startNavigation] = useTransition();

  function validate(value: string): string | null {
    if (value.trim() === '') return copy.login.handleRequired;
    if (classifyHandle(value) === null) return copy.login.handleInvalid;
    return null;
  }

  async function handleSubmit() {
    setRequestError(null);

    const error = validate(handle);
    setFieldError(error);
    if (error !== null) return;

    setSubmitting(true);
    const result = await login(handle.trim());
    setSubmitting(false);

    if (!result.ok) {
      setRequestError(result.failure.message);
      return;
    }

    startNavigation(() => {
      router.replace(isSafeRedirect(next) ? next : '/home');
      router.refresh();
    });
  }

  const busy = submitting || isNavigating;

  return (
    <Card>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <Stack>
          {requestError !== null ? (
            <Alert tone="danger" title={copy.login.failedTitle}>
              {requestError}
            </Alert>
          ) : null}

          <TextField
            label={copy.login.handleLabel}
            name="handle"
            type="text"
            inputMode="email"
            autoComplete="username"
            placeholder={copy.login.handlePlaceholder}
            value={handle}
            disabled={busy}
            error={fieldError}
            onChange={(event) => {
              setHandle(event.target.value);
              if (fieldError !== null) setFieldError(validate(event.target.value));
            }}
            onBlur={(event) => {
              if (event.target.value !== '') setFieldError(validate(event.target.value));
            }}
          />

          <Button type="submit" block loading={busy}>
            {busy ? copy.login.submitting : copy.login.submit}
          </Button>
        </Stack>
      </form>
    </Card>
  );
}

function isSafeRedirect(target: string): boolean {
  return target.startsWith('/') && !target.startsWith('//');
}
