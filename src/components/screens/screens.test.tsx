import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ContactId, Receipt, TransactionId } from '@/domain/models';
import { cents } from '@/domain/money';
import { renderWithStore } from '@/store/test-utils';

import { LoginScreen } from './login-screen';
import { NotFoundScreen } from './not-found-screen';
import { ReceiptScreen } from './receipt-screen';
import { TransferScreen } from './transfer-screen';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn(), back: vi.fn() }),
}));

const RECEIPT: Receipt = {
  transactionId: 'txn_1' as TransactionId,
  reference: 'ABC123DEF456',
  amount: cents(30_00),
  currency: 'USD',
  recipient: { contactId: 'con_1' as ContactId, name: 'Lucía', handle: 'lucia@example.com' },
  note: null,
  createdAt: '2026-08-12T15:00:00.000Z',
  balanceAfter: cents(4_820_75),
};

describe('screen landmarks and headings', () => {
  it('LoginScreen exposes one main landmark and one h1', () => {
    render(<LoginScreen next="/home" />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('TransferScreen exposes one main landmark and one h1', () => {
    renderWithStore(
      <TransferScreen contacts={[]} availableBalance={cents(1_000_00)} ownHandles={[]} />,
    );

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Nueva transacción' }),
    ).toBeInTheDocument();
  });

  it('ReceiptScreen titles the outcome as the page heading', () => {
    render(<ReceiptScreen receipt={RECEIPT} />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Transferencia enviada' }),
    ).toBeInTheDocument();
  });

  it('NotFoundScreen has a heading rather than a bare paragraph', () => {
    render(<NotFoundScreen />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'No encontramos esta página' }),
    ).toBeInTheDocument();
  });

  it('ReceiptScreen renders the reference for the user to quote', () => {
    render(<ReceiptScreen receipt={RECEIPT} />);
    expect(screen.getByText('ABC123DEF456')).toBeInTheDocument();
  });
});
