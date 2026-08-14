import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Account, UserId } from '@/domain/models';
import { cents } from '@/domain/money';

import { BalanceCard } from './index';

function account(balance: number): Account {
  return { userId: 'usr_1' as UserId, balance: cents(balance), currency: 'USD' };
}

describe('BalanceCard', () => {
  it('formats the balance as currency', () => {
    render(<BalanceCard account={account(4_850_75)} ownerName="Paola Elizalde" />);
    expect(screen.getByTestId('balance')).toHaveTextContent('$4,850.75');
  });

  it('renders a zero balance rather than hiding it', () => {
    render(<BalanceCard account={account(0)} ownerName="Paola Elizalde" />);
    expect(screen.getByTestId('balance')).toHaveTextContent('$0.00');
  });

  it('shows the account owner', () => {
    render(<BalanceCard account={account(100)} ownerName="Paola Elizalde" />);
    expect(screen.getByText('Paola Elizalde')).toBeInTheDocument();
  });

  it('labels what the number means', () => {
    render(<BalanceCard account={account(100)} ownerName="Paola Elizalde" />);
    expect(screen.getByText('Saldo disponible')).toBeInTheDocument();
  });
});
