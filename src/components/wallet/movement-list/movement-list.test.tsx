import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Movement, MovementId } from '@/domain/models';
import { cents } from '@/domain/money';

import { MovementList } from './index';

function movement(overrides: Partial<Movement> = {}): Movement {
  return {
    id: 'mov_1' as MovementId,
    description: 'Transferencia enviada',
    counterparty: 'Lucía Fernández',
    amount: cents(150_00),
    direction: 'debit',
    status: 'settled',
    createdAt: '2026-08-10T12:00:00.000Z',
    ...overrides,
  };
}

describe('MovementList', () => {
  it('renders one item per movement', () => {
    render(
      <MovementList
        movements={[
          movement(),
          movement({ id: 'mov_2' as MovementId, counterparty: 'Martín Suárez' }),
        ]}
      />,
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('renders an empty list without crashing', () => {
    render(<MovementList movements={[]} />);
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('signs a debit negatively', () => {
    render(<MovementList movements={[movement({ direction: 'debit' })]} />);
    expect(screen.getByText('-$150.00')).toBeInTheDocument();
  });

  it('signs a credit positively', () => {
    render(<MovementList movements={[movement({ direction: 'credit' })]} />);
    expect(screen.getByText('+$150.00')).toBeInTheDocument();
  });

  it('shows the counterparty and description', () => {
    render(<MovementList movements={[movement()]} />);

    expect(screen.getByText('Lucía Fernández')).toBeInTheDocument();
    expect(screen.getByText(/Transferencia enviada/)).toBeInTheDocument();
  });

  it('flags a pending movement', () => {
    render(<MovementList movements={[movement({ status: 'pending' })]} />);
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('does not flag a settled movement', () => {
    render(<MovementList movements={[movement({ status: 'settled' })]} />);
    expect(screen.queryByText('Pendiente')).not.toBeInTheDocument();
  });

  it('derives initials from the counterparty for the avatar', () => {
    render(<MovementList movements={[movement({ counterparty: 'Lucía Fernández' })]} />);
    expect(screen.getByText('LF')).toBeInTheDocument();
  });
});
