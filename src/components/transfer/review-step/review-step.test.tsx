import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ContactId } from '@/domain/models';
import { type Cents, cents } from '@/domain/money';
import type { TransferCommand } from '@/domain/transfer/rules';
import { renderWithStore } from '@/store/test-utils';

import { ReviewStep } from './index';

const BALANCE: Cents = cents(1_000_00);

const COMMAND: TransferCommand = {
  amount: cents(250_50),
  recipient: {
    contactId: 'con_1' as ContactId,
    name: 'Lucía Fernández',
    handle: 'lucia@example.com',
  },
  note: null,
};

function renderReview(command: TransferCommand = COMMAND, onConfirm = vi.fn(), onBack = vi.fn()) {
  renderWithStore(<ReviewStep command={command} onConfirm={onConfirm} onBack={onBack} />, {
    transfer: { availableBalance: BALANCE },
  });
  return { onConfirm, onBack };
}

describe('ReviewStep', () => {
  it('shows the amount and recipient before confirming', () => {
    renderReview();

    expect(screen.getByTestId('summary-amount')).toHaveTextContent('$250.50');
    expect(screen.getByTestId('summary-recipient')).toHaveTextContent('Lucía Fernández');
  });

  it('shows where the money is going', () => {
    renderReview();
    expect(screen.getByText('lucia@example.com')).toBeInTheDocument();
  });

  it('computes the balance the user will be left with', () => {
    renderReview();
    expect(screen.getByText('$749.50')).toBeInTheDocument();
  });

  it('omits the note row when there is no note', () => {
    renderReview();
    expect(screen.queryByText('Nota')).not.toBeInTheDocument();
  });

  it('shows the note when there is one', () => {
    renderReview({ ...COMMAND, note: 'Cena del viernes' });
    expect(screen.getByText('Cena del viernes')).toBeInTheDocument();
  });

  it('shows no error before anything has been submitted', () => {
    renderReview();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('confirms through its callback', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderReview();

    await user.click(screen.getByTestId('confirm'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('goes back through its callback', async () => {
    const user = userEvent.setup();
    const { onBack } = renderReview();

    await user.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
