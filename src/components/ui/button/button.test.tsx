import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button, ButtonLink } from './index';

describe('Button', () => {
  it('renders its label and fires onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Continuar</Button>);

    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>Continuar</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('accepts an explicit submit type', () => {
    render(<Button type="submit">Enviar</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('is disabled and busy while loading', () => {
    render(<Button loading>Enviando</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('cannot be clicked while loading', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Enviando
      </Button>,
    );

    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('respects an explicit disabled prop', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Continuar
      </Button>,
    );

    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('ButtonLink', () => {
  it('renders an anchor, not a button', () => {
    render(<ButtonLink href="/home">Volver</ButtonLink>);

    const link = screen.getByRole('link', { name: 'Volver' });
    expect(link).toHaveAttribute('href', '/home');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('prefetches by default and can opt out for secondary links', () => {
    const { rerender } = render(<ButtonLink href="/home">Volver</ButtonLink>);
    expect(screen.getByRole('link')).toBeInTheDocument();

    rerender(
      <ButtonLink href="/home" prefetch={false}>
        Volver
      </ButtonLink>,
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/home');
  });
});
