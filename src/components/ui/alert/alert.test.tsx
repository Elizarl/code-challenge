import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Alert } from './index';

describe('Alert', () => {
  it('uses role="alert" for danger so it interrupts a screen reader', () => {
    render(<Alert tone="danger" title="Error de red" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Error de red');
  });

  it('uses the politer role="status" for success', () => {
    render(<Alert tone="success" title="Listo" />);
    expect(screen.getByRole('status')).toHaveTextContent('Listo');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders an optional body alongside the title', () => {
    render(
      <Alert tone="danger" title="Error de red">
        <p>Revisa tu conexión.</p>
      </Alert>,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Error de red');
    expect(alert).toHaveTextContent('Revisa tu conexión.');
  });

  it('renders without a body', () => {
    render(<Alert tone="danger" title="Solo título" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Solo título');
  });
});
