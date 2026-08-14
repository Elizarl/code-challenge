import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppHeader } from './index';

const replace = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn(), back: vi.fn() }),
}));

const logout = vi.fn();
vi.mock('@/api/client', () => ({
  logout: () => logout() as unknown,
}));

beforeEach(() => {
  vi.clearAllMocks();
  logout.mockResolvedValue({ ok: true, data: { ok: true } });
});

describe('AppHeader', () => {
  it('greets the signed-in user', () => {
    render(<AppHeader name="Paola Elizalde" />);
    expect(screen.getByText('Paola Elizalde')).toBeInTheDocument();
  });

  it('signs out and returns to login', async () => {
    const user = userEvent.setup();
    render(<AppHeader name="Paola Elizalde" />);

    await user.click(screen.getByRole('button', { name: 'Salir' }));

    await waitFor(() => {
      expect(logout).toHaveBeenCalledOnce();
    });
    expect(replace).toHaveBeenCalledWith('/login');
  });

  it('refreshes so the server re-reads the cleared session cookie', async () => {
    const user = userEvent.setup();
    render(<AppHeader name="Paola Elizalde" />);

    await user.click(screen.getByRole('button', { name: 'Salir' }));

    await waitFor(() => {
      expect(refresh).toHaveBeenCalledOnce();
    });
  });

  it('cannot be triggered twice while signing out', async () => {
    const user = userEvent.setup();
    logout.mockReturnValue(new Promise(() => undefined));
    render(<AppHeader name="Paola Elizalde" />);

    const button = screen.getByRole('button', { name: 'Salir' });
    await user.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
    });
    expect(logout).toHaveBeenCalledOnce();
  });
});
