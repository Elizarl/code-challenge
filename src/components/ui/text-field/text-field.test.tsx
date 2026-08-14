import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TextField } from './index';

describe('TextField', () => {
  it('associates the label with the input', () => {
    render(<TextField label="Email o teléfono" />);
    expect(screen.getByLabelText('Email o teléfono')).toBeInTheDocument();
  });

  it('generates unique ids so it can be rendered twice on one page', () => {
    render(
      <>
        <TextField label="Nombre" />
        <TextField label="Apellido" />
      </>,
    );

    const first = screen.getByLabelText('Nombre');
    const second = screen.getByLabelText('Apellido');
    expect(first.id).not.toBe(second.id);
  });

  it('reports typing through onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TextField label="Nombre" value="" onChange={onChange} />);

    await user.type(screen.getByLabelText('Nombre'), 'Ana');
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it('is not marked invalid without an error', () => {
    render(<TextField label="Nombre" />);
    expect(screen.getByLabelText('Nombre')).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('exposes the error to assistive tech via aria-describedby', () => {
    render(<TextField label="Nombre" error="Campo requerido" />);

    const input = screen.getByLabelText('Nombre');
    const alert = screen.getByRole('alert');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(alert).toHaveTextContent('Campo requerido');
    expect(input.getAttribute('aria-describedby')).toContain(alert.id);
  });

  it('treats an empty error string as no error', () => {
    render(<TextField label="Nombre" error="" />);
    expect(screen.getByLabelText('Nombre')).toHaveAttribute('aria-invalid', 'false');
  });

  it('links a hint and an error together', () => {
    render(<TextField label="Nombre" hint="Como aparece en tu documento" error="Requerido" />);

    const describedBy = screen.getByLabelText('Nombre').getAttribute('aria-describedby') ?? '';
    expect(describedBy.split(' ')).toHaveLength(2);
    expect(screen.getByText('Como aparece en tu documento')).toBeInTheDocument();
  });
});
