import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { Contact, ContactId } from '@/domain/models';
import { type Cents, cents } from '@/domain/money';
import { renderWithStore } from '@/store/test-utils';

import { ComposeStep } from './index';

const BALANCE: Cents = cents(1_000_00);

const CONTACTS: Contact[] = [
  {
    id: 'con_1' as ContactId,
    name: 'Lucía Fernández',
    handle: 'lucia@example.com',
    isFavorite: true,
  },
  { id: 'con_2' as ContactId, name: 'Martín Suárez', handle: '+15555550111', isFavorite: true },
];

function renderStep() {
  return renderWithStore(<ComposeStep />, {
    transfer: {
      contacts: CONTACTS,
      availableBalance: BALANCE,
      ownHandles: ['demo@wallet.com', '+15555550100'],
    },
  });
}

const amountInput = () => screen.getByLabelText('Monto a enviar');
const continueButton = () => screen.getByTestId('continue');

describe('ComposeStep', () => {
  it('starts with the continue button disabled', () => {
    renderStep();
    expect(continueButton()).toBeDisabled();
  });

  it('shows the available balance', () => {
    renderStep();
    expect(screen.getByText('Disponible: $1,000.00')).toBeInTheDocument();
  });

  it('enables continue once a valid amount and recipient are chosen', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.type(amountInput(), '25.50');
    expect(continueButton()).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Lucía Fernández/ }));
    expect(continueButton()).toBeEnabled();
  });

  it('blocks and explains an amount above the balance', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByRole('button', { name: /Lucía Fernández/ }));
    await user.type(amountInput(), '1500');
    await user.tab();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Saldo insuficiente. Tu saldo disponible es $1,000.00.',
    );
    expect(continueButton()).toBeDisabled();
  });

  it('refuses to accept letters in the amount field', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.type(amountInput(), 'abc');
    expect(amountInput()).toHaveValue('');
  });

  it('keeps only the digits when letters are mixed in', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.type(amountInput(), '1a2b.5c');
    expect(amountInput()).toHaveValue('12.5');
  });

  it('allows one decimal separator and at most two decimals', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.type(amountInput(), '10.999');
    expect(amountInput()).toHaveValue('10.99');
  });

  it('blocks a zero amount', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByRole('button', { name: /Lucía Fernández/ }));
    await user.type(amountInput(), '0');
    await user.tab();

    expect(await screen.findByRole('alert')).toHaveTextContent('El monto debe ser mayor a cero.');
    expect(continueButton()).toBeDisabled();
  });

  it('does not shout at the user before they have touched the field', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.type(amountInput(), '5');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('rejects a manually entered recipient with an unusable handle', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.type(amountInput(), '10');
    await user.click(screen.getByRole('tab', { name: 'Nuevo contacto' }));
    await user.type(screen.getByLabelText('Nombre'), 'Ana Pérez');
    await user.type(screen.getByLabelText('Email o teléfono'), 'not-a-handle');
    await user.tab();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ingresa un email o teléfono válido.',
    );
    expect(continueButton()).toBeDisabled();
  });

  it('accepts a valid manually entered recipient', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.type(amountInput(), '10');
    await user.click(screen.getByRole('tab', { name: 'Nuevo contacto' }));
    await user.type(screen.getByLabelText('Nombre'), 'Ana Pérez');
    await user.type(screen.getByLabelText('Email o teléfono'), 'ana@example.com');

    expect(continueButton()).toBeEnabled();
  });

  it('refuses a transfer to the user themselves', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.type(amountInput(), '10');
    await user.click(screen.getByRole('tab', { name: 'Nuevo contacto' }));
    await user.type(screen.getByLabelText('Nombre'), 'Yo mismo');
    await user.type(screen.getByLabelText('Email o teléfono'), 'demo@wallet.com');
    await user.tab();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No puedes enviarte dinero a ti mismo.',
    );
    expect(continueButton()).toBeDisabled();
  });

  it('clears the manual entry when switching back to favourites', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByRole('tab', { name: 'Nuevo contacto' }));
    await user.type(screen.getByLabelText('Nombre'), 'Ana');
    await user.click(screen.getByRole('tab', { name: 'Favoritos' }));
    await user.click(screen.getByRole('tab', { name: 'Nuevo contacto' }));

    expect(screen.getByLabelText('Nombre')).toHaveValue('');
  });
});
