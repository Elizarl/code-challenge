import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Contact, ContactId } from '@/domain/models';
import { type Cents, cents } from '@/domain/money';
import { renderWithStore } from '@/store/test-utils';

import { TransferFlow } from './index';

const replace = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn(), back: vi.fn() }),
}));

const createTransfer = vi.fn();
vi.mock('@/api/client', () => ({
  createTransfer: (...args: unknown[]) => createTransfer(...args) as unknown,
}));

const BALANCE: Cents = cents(1_000_00);

const CONTACTS: Contact[] = [
  {
    id: 'con_1' as ContactId,
    name: 'Lucía Fernández',
    handle: 'lucia@example.com',
    isFavorite: true,
  },
];

function renderFlow() {
  renderWithStore(<TransferFlow contacts={CONTACTS} availableBalance={BALANCE} ownHandles={[]} />);
}

async function reachReview(user: ReturnType<typeof userEvent.setup>, amount = '30.00') {
  await user.click(screen.getByRole('button', { name: /Lucía Fernández/ }));
  await user.type(screen.getByLabelText('Monto a enviar'), amount);
  await user.click(screen.getByTestId('continue'));
  await screen.findByTestId('summary-amount');
}

beforeEach(() => {
  vi.clearAllMocks();
  createTransfer.mockResolvedValue({
    ok: true,
    data: { receipt: { transactionId: 'txn_1' }, account: {}, savedContactId: null, contacts: [] },
  });
});

describe('TransferFlow', () => {
  it('starts on the compose step', () => {
    renderFlow();
    expect(screen.getByLabelText('Monto a enviar')).toBeInTheDocument();
    expect(screen.queryByTestId('summary-amount')).not.toBeInTheDocument();
  });

  it('advances to the review step with the entered values', async () => {
    const user = userEvent.setup();
    renderFlow();
    await reachReview(user, '42.75');

    expect(screen.getByTestId('summary-amount')).toHaveTextContent('$42.75');
    expect(screen.getByTestId('summary-recipient')).toHaveTextContent('Lucía Fernández');
  });

  it('goes back to compose with the draft intact', async () => {
    const user = userEvent.setup();
    renderFlow();
    await reachReview(user, '42.75');

    await user.click(screen.getByRole('button', { name: 'Volver' }));
    expect(screen.getByLabelText('Monto a enviar')).toHaveValue('42.75');
  });

  it('navigates to the receipt on success', async () => {
    const user = userEvent.setup();
    renderFlow();
    await reachReview(user);

    await user.click(screen.getByTestId('confirm'));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/receipt/txn_1');
    });
  });

  it('sends the raw amount string so the server re-parses it', async () => {
    const user = userEvent.setup();
    renderFlow();
    await reachReview(user, '30.00');

    await user.click(screen.getByTestId('confirm'));

    await waitFor(() => {
      expect(createTransfer).toHaveBeenCalledOnce();
    });
    const [body] = createTransfer.mock.calls[0] as [{ amountInput: string }];
    expect(body.amountInput).toBe('30.00');
  });

  it('shows a retryable failure and stays on review', async () => {
    const user = userEvent.setup();
    createTransfer.mockResolvedValue({
      ok: false,
      failure: { code: 'TIMEOUT', message: 'lento', retryable: true, violations: [] },
    });
    renderFlow();
    await reachReview(user);

    await user.click(screen.getByTestId('confirm'));

    expect(await screen.findByRole('alert')).toHaveTextContent('La operación tardó demasiado');
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByTestId('confirm')).toBeEnabled();
  });

  it('tells the user to edit when the failure is not retryable', async () => {
    const user = userEvent.setup();
    createTransfer.mockResolvedValue({
      ok: false,
      failure: {
        code: 'INSUFFICIENT_FUNDS',
        message: 'sin fondos',
        retryable: false,
        violations: [],
      },
    });
    renderFlow();
    await reachReview(user);

    await user.click(screen.getByTestId('confirm'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Modifica la transferencia antes de volver a intentar.',
    );
  });

  it('reuses the idempotency key when retrying the same draft', async () => {
    const user = userEvent.setup();
    createTransfer.mockResolvedValue({
      ok: false,
      failure: { code: 'TIMEOUT', message: 'lento', retryable: true, violations: [] },
    });
    renderFlow();
    await reachReview(user);

    await user.click(screen.getByTestId('confirm'));
    await screen.findByRole('alert');
    await user.click(screen.getByTestId('confirm'));

    await waitFor(() => {
      expect(createTransfer).toHaveBeenCalledTimes(2);
    });

    const [, first] = createTransfer.mock.calls[0] as [unknown, { idempotencyKey: string }];
    const [, second] = createTransfer.mock.calls[1] as [unknown, { idempotencyKey: string }];
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
  });
});
