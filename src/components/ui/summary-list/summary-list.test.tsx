import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SummaryList, SummaryRow } from './index';

describe('SummaryList', () => {
  it('renders each row as a list item', () => {
    render(
      <SummaryList>
        <SummaryRow label="Para">Ana Pérez</SummaryRow>
        <SummaryRow label="Destino">ana@example.com</SummaryRow>
      </SummaryList>,
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('pairs each label with its value', () => {
    render(
      <SummaryList>
        <SummaryRow label="Para">Ana Pérez</SummaryRow>
      </SummaryList>,
    );

    const row = screen.getByRole('listitem');
    expect(row).toHaveTextContent('Para');
    expect(row).toHaveTextContent('Ana Pérez');
  });

  it('exposes a test id on the value when asked', () => {
    render(
      <SummaryList>
        <SummaryRow label="Para" testId="summary-recipient">
          Ana Pérez
        </SummaryRow>
      </SummaryList>,
    );

    expect(screen.getByTestId('summary-recipient')).toHaveTextContent('Ana Pérez');
  });

  it('applies a monospace treatment for references', () => {
    render(
      <SummaryList>
        <SummaryRow label="Referencia" mono testId="plain">
          ABC123
        </SummaryRow>
      </SummaryList>,
    );

    expect(screen.getByTestId('plain').className.split(' ').length).toBeGreaterThan(1);
  });
});
