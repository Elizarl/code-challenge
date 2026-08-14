import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MovementId, UserId, WalletSnapshot } from '@/domain/models';
import { cents } from '@/domain/money';
import { renderWithStore } from '@/store/test-utils';

import { WalletPanel } from './index';

const fetchWallet = vi.fn();
vi.mock('@/api/client', () => ({
  fetchWallet: (...args: unknown[]) => fetchWallet(...args) as unknown,
}));

const SNAPSHOT: WalletSnapshot = {
  user: {
    id: 'usr_1' as UserId,
    fullName: 'Paola Elizalde',
    email: 'demo@wallet.com',
    phone: '+15555550100',
  },
  account: { userId: 'usr_1' as UserId, balance: cents(4_850_75), currency: 'USD' },
  movements: [
    {
      id: 'mov_1' as MovementId,
      description: 'Transferencia enviada',
      counterparty: 'Lucía Fernández',
      amount: cents(150_00),
      direction: 'debit',
      status: 'settled',
      createdAt: '2026-08-10T12:00:00.000Z',
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  fetchWallet.mockResolvedValue({ ok: true, data: SNAPSHOT });
});

describe('WalletPanel', () => {
  it('renders the balance and movements once loaded', async () => {
    renderWithStore(<WalletPanel />);

    expect(await screen.findByTestId('balance')).toHaveTextContent('$4,850.75');
    expect(screen.getByText('Lucía Fernández')).toBeInTheDocument();
  });

  it('links to the transfer flow', async () => {
    renderWithStore(<WalletPanel />);

    const link = await screen.findByRole('link', { name: 'Nueva transacción' });
    expect(link).toHaveAttribute('href', '/transfer');
  });

  it('shows the empty state without hiding the balance', async () => {
    fetchWallet.mockResolvedValue({ ok: true, data: { ...SNAPSHOT, movements: [] } });
    renderWithStore(<WalletPanel />);

    expect(await screen.findByText('Todavía no hay movimientos')).toBeInTheDocument();
    expect(screen.getByTestId('balance')).toBeInTheDocument();
    expect(screen.queryByTestId('movement-list')).not.toBeInTheDocument();
  });

  it('shows an error state with a retry affordance', async () => {
    fetchWallet.mockResolvedValue({
      ok: false,
      failure: {
        code: 'UNKNOWN_ERROR',
        message: 'No pudimos cargar tu cartera digital.',
        retryable: true,
        violations: [],
      },
    });
    renderWithStore(<WalletPanel />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar tu cartera digital.',
    );
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('recovers when a retry succeeds', async () => {
    const user = userEvent.setup();
    fetchWallet.mockResolvedValueOnce({
      ok: false,
      failure: { code: 'UNKNOWN_ERROR', message: 'falló', retryable: true, violations: [] },
    });
    renderWithStore(<WalletPanel />);

    await screen.findByRole('alert');
    fetchWallet.mockResolvedValue({ ok: true, data: SNAPSHOT });

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByTestId('balance')).toHaveTextContent('$4,850.75');
  });

  it('refetches from the beginning when the error state is retried', async () => {
    const user = userEvent.setup();
    fetchWallet.mockResolvedValueOnce({
      ok: false,
      failure: { code: 'UNKNOWN_ERROR', message: 'falló', retryable: true, violations: [] },
    });
    renderWithStore(<WalletPanel />);
    await screen.findByRole('alert');

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => {
      expect(fetchWallet).toHaveBeenCalledTimes(2);
    });
  });
});
