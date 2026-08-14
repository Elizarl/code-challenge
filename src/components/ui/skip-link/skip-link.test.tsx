import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Main } from '@/components/ui/layout';

import { MAIN_CONTENT_ID, SkipLink } from './index';

describe('SkipLink', () => {
  it('is a link that targets the main landmark', () => {
    render(<SkipLink />);

    expect(screen.getByRole('link', { name: 'Saltar al contenido principal' })).toHaveAttribute(
      'href',
      `#${MAIN_CONTENT_ID}`,
    );
  });

  it('points at an id that Main actually renders', () => {
    render(
      <>
        <SkipLink />
        <Main>
          <p>contenido</p>
        </Main>
      </>,
    );

    const target = screen.getByRole('main');
    expect(target).toHaveAttribute('id', MAIN_CONTENT_ID);
    expect(target).toHaveAttribute('tabindex', '-1');
  });
});
