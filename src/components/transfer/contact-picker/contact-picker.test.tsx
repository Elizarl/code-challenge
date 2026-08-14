import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Contact, ContactId } from '@/domain/models';

import { ContactPicker } from './index';

const CONTACTS: Contact[] = [
  {
    id: 'con_1' as ContactId,
    name: 'Lucía Fernández',
    handle: 'lucia@example.com',
    isFavorite: true,
  },
  { id: 'con_2' as ContactId, name: 'Diego Ortiz', handle: '+15555550133', isFavorite: false },
];

describe('ContactPicker', () => {
  it('renders every contact as a real button so it is keyboard reachable', () => {
    render(<ContactPicker contacts={CONTACTS} selectedId={null} onSelect={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('shows each contact name and handle', () => {
    render(<ContactPicker contacts={CONTACTS} selectedId={null} onSelect={vi.fn()} />);

    expect(screen.getByText('Lucía Fernández')).toBeInTheDocument();
    expect(screen.getByText('lucia@example.com')).toBeInTheDocument();
  });

  it('reports the whole contact on selection, not just an id', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ContactPicker contacts={CONTACTS} selectedId={null} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /Lucía Fernández/ }));
    expect(onSelect).toHaveBeenCalledWith(CONTACTS[0]);
  });

  it('marks the selected contact with aria-pressed', () => {
    render(<ContactPicker contacts={CONTACTS} selectedId="con_2" onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Diego Ortiz/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /Lucía Fernández/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('marks favourites', () => {
    render(<ContactPicker contacts={CONTACTS} selectedId={null} onSelect={vi.fn()} />);
    expect(screen.getAllByLabelText('Favorito')).toHaveLength(1);
  });

  it('can be disabled as a whole', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ContactPicker contacts={CONTACTS} selectedId={null} onSelect={onSelect} disabled />);

    await user.click(screen.getByRole('button', { name: /Lucía Fernández/ }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('renders nothing but an empty list when there are no contacts', () => {
    render(<ContactPicker contacts={[]} selectedId={null} onSelect={vi.fn()} />);
    expect(screen.getByTestId('contact-list')).toBeEmptyDOMElement();
  });
});
