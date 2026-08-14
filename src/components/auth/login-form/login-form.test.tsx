import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginForm } from './index';

const replace = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn(), back: vi.fn() }),
}));

const login = vi.fn();
vi.mock('@/api/client', () => ({
  login: (...args: unknown[]) => login(...args) as unknown,
}));

beforeEach(() => {
  vi.clearAllMocks();
  login.mockResolvedValue({ ok: true, data: { user: { fullName: 'Paola' } } });
});

const field = () => screen.getByLabelText('Email o teléfono');
const submit = () => screen.getByRole('button', { name: /Ingresar/ });

describe('LoginForm', () => {
  it('rejects an empty field without calling the API', async () => {
    const user = userEvent.setup();
    render(<LoginForm next="/home" />);

    await user.click(submit());

    expect(await screen.findByRole('alert')).toHaveTextContent('Ingresa tu email o teléfono.');
    expect(login).not.toHaveBeenCalled();
  });

  it('rejects a malformed handle without calling the API', async () => {
    const user = userEvent.setup();
    render(<LoginForm next="/home" />);

    await user.type(field(), 'no-es-un-handle');
    await user.click(submit());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ingresa un email o teléfono válido.',
    );
    expect(login).not.toHaveBeenCalled();
  });

  it('accepts a valid email and navigates on success', async () => {
    const user = userEvent.setup();
    render(<LoginForm next="/home" />);

    await user.type(field(), 'demo@wallet.com');
    await user.click(submit());

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('demo@wallet.com');
    });
    expect(replace).toHaveBeenCalledWith('/home');
  });

  it('accepts a phone number', async () => {
    const user = userEvent.setup();
    render(<LoginForm next="/home" />);

    await user.type(field(), '+15555550100');
    await user.click(submit());

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('+15555550100');
    });
  });

  it('returns the user to where they were heading', async () => {
    const user = userEvent.setup();
    render(<LoginForm next="/transfer" />);

    await user.type(field(), 'demo@wallet.com');
    await user.click(submit());

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/transfer');
    });
  });

  it('refuses an absolute URL as a redirect target', async () => {
    const user = userEvent.setup();
    render(<LoginForm next="https://evil.example.com" />);

    await user.type(field(), 'demo@wallet.com');
    await user.click(submit());

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/home');
    });
  });

  it('refuses a protocol-relative URL as a redirect target', async () => {
    const user = userEvent.setup();
    render(<LoginForm next="//evil.example.com" />);

    await user.type(field(), 'demo@wallet.com');
    await user.click(submit());

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/home');
    });
  });

  it('surfaces a server failure and leaves the form usable', async () => {
    const user = userEvent.setup();
    login.mockResolvedValue({
      ok: false,
      failure: {
        code: 'UNKNOWN_ERROR',
        message: 'No pudimos iniciar sesión.',
        retryable: true,
        violations: [],
      },
    });
    render(<LoginForm next="/home" />);

    await user.type(field(), 'error@wallet.com');
    await user.click(submit());

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos iniciar sesión.');
    expect(replace).not.toHaveBeenCalled();
    expect(field()).toBeEnabled();
  });

  it('trims surrounding whitespace before sending', async () => {
    const user = userEvent.setup();
    render(<LoginForm next="/home" />);

    await user.type(field(), '  demo@wallet.com  ');
    await user.click(submit());

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('demo@wallet.com');
    });
  });
});
