import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card, PageShell, PageTitle, Row, SectionTitle, Stack } from './index';

describe('layout primitives', () => {
  it('PageShell renders its children', () => {
    render(
      <PageShell>
        <p>contenido</p>
      </PageShell>,
    );
    expect(screen.getByText('contenido')).toBeInTheDocument();
  });

  it('Card renders a section and forwards aria-labelledby', () => {
    render(
      <>
        <h2 id="heading">Movimientos</h2>
        <Card aria-labelledby="heading">
          <p>fila</p>
        </Card>
      </>,
    );

    expect(screen.getByRole('region', { name: 'Movimientos' })).toBeInTheDocument();
    expect(screen.getByText('fila')).toBeInTheDocument();
  });

  it('Stack and Row render their children', () => {
    render(
      <Stack>
        <Row>
          <span>izquierda</span>
          <span>derecha</span>
        </Row>
      </Stack>,
    );

    expect(screen.getByText('izquierda')).toBeInTheDocument();
    expect(screen.getByText('derecha')).toBeInTheDocument();
  });

  it('PageTitle is an h1 and SectionTitle an h2', () => {
    render(
      <>
        <PageTitle>Nueva transacción</PageTitle>
        <SectionTitle>Destinatario</SectionTitle>
      </>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Nueva transacción' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Destinatario' })).toBeInTheDocument();
  });

  it('SectionTitle accepts an id so a Card can reference it', () => {
    render(<SectionTitle id="movements-heading">Movimientos</SectionTitle>);
    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('id', 'movements-heading');
  });
});
