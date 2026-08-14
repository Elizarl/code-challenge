'use client';

import { useEffect } from 'react';

import { copy } from '@/messages/es';

export default function GlobalError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    console.error('Root layout error', error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <main
          style={{
            minHeight: '100dvh',
            display: 'grid',
            placeItems: 'center',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 650 }}>{copy.errors.bootTitle}</h1>
            <p style={{ marginTop: '0.5rem', color: '#6b7280' }}>{copy.errors.bootDescription}</p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: '1.5rem',
                minHeight: '2.875rem',
                padding: '0 1.5rem',
                border: 'none',
                borderRadius: '12px',
                background: '#4a17b8',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copy.app.retry}
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
