import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EmptyState, ErrorState, LoadingState } from './index';

describe('LoadingState', () => {
  it('announces itself politely while loading', () => {
    render(<LoadingState label="Cargando tu cartera digital" />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Cargando tu cartera digital');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });
});

describe('EmptyState', () => {
  it('renders a title and description', () => {
    render(<EmptyState title="Sin movimientos" description="Aún no hay nada aquí." />);

    expect(screen.getByText('Sin movimientos')).toBeInTheDocument();
    expect(screen.getByText('Aún no hay nada aquí.')).toBeInTheDocument();
  });

  it('renders without a description', () => {
    render(<EmptyState title="Sin movimientos" />);
    expect(screen.getByText('Sin movimientos')).toBeInTheDocument();
  });

  it('renders an optional action', () => {
    render(<EmptyState title="Sin contactos" action={<button type="button">Agregar</button>} />);
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  it('is announced as an alert', () => {
    render(<ErrorState title="Algo salió mal" description="Intenta nuevamente." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Algo salió mal');
  });

  it('omits the retry button when no handler is given', () => {
    render(<ErrorState title="Algo salió mal" description="Intenta nuevamente." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onRetry when the button is pressed', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState title="Error" description="Falló." onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('disables retry while a retry is already in flight', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState title="Error" description="Falló." onRetry={onRetry} retrying />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    await user.click(button);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('accepts a custom retry label', () => {
    render(
      <ErrorState
        title="Error"
        description="Falló."
        onRetry={vi.fn()}
        retryLabel="Volver a cargar"
      />,
    );
    expect(screen.getByRole('button', { name: 'Volver a cargar' })).toBeInTheDocument();
  });
});
